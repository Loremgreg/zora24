from __future__ import annotations

import asyncio
import datetime
import logging
import os
import sys
from dataclasses import dataclass
from typing import Literal
from zoneinfo import ZoneInfo

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from calendar_api import AvailableSlot, CalComCalendar, Calendar, FakeCalendar, SlotUnavailableError
from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    MetricsCollectedEvent,
    RunContext,
    ToolError,
    WorkerOptions,
    cli,
    function_tool,
    metrics,
)
from livekit.plugins import elevenlabs, deepgram, openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Import Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    logger.warning("⚠️ Bibliothèque supabase-py non installée, configuration Cal.com indisponible")
    create_client = None


load_dotenv()


logger = logging.getLogger("zora-agent")


async def get_assistant_calcom_config(assistant_id: str) -> dict | None:
    """
    Récupère la configuration Cal.com d'un assistant depuis Supabase

    Args:
        assistant_id: L'ID de l'assistant

    Returns:
        Configuration Cal.com ou None si non configuré
    """
    try:
        # Vérifier si supabase est disponible
        if create_client is None:
            logger.warning("⚠️ Bibliothèque supabase-py non disponible")
            return None

        # Créer le client Supabase
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_key:
            logger.warning("⚠️ Variables d'environnement Supabase manquantes")
            return None

        supabase: Client = create_client(supabase_url, supabase_key)

        # Appeler la fonction Supabase
        response = await supabase.functions.invoke('get-assistant-calcom-config', {
            'body': { 'assistantId': assistant_id }
        })

        if response.error:
            logger.error(f"❌ Erreur récupération config Cal.com: {response.error}")
            return None

        data = response.data
        if data and data.get('calcomConfig'):
            calcom_config = data['calcomConfig']
            logger.info("✅ Configuration Cal.com récupérée depuis Supabase")
            return calcom_config
        else:
            logger.info("ℹ️ Aucune configuration Cal.com trouvée")
            return None

    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération de la config Cal.com: {e}")
        return None


class ZoraAgent(Agent):
    """
    Agent vocal intelligent Zora24.ai pour la prise de rendez-vous.
    Supporte les templates de prompt personnalisés et fonctionne exclusivement en français.
    """
    
    def __init__(self, *, timezone: str, custom_prompt: str = None) -> None:
        self.tz = ZoneInfo(timezone)
        today = datetime.datetime.now(self.tz).strftime("%A %d %B %Y")

        # Prompt par défaut ou personnalisé
        if custom_prompt:
            instructions = custom_prompt.replace("{today}", today)
        else:
            instructions = self._get_default_prompt(today)

        super().__init__(instructions=instructions)
        self._slots_map: dict[str, AvailableSlot] = {}

    def _get_default_prompt(self, today: str) -> str:
        """Prompt par défaut optimisé pour le MVP Zora24.ai"""
        return (
            f"Tu es Zora, l'assistante vocale intelligente de Zora24.ai. "
            f"Nous sommes le {today}. "
            f"Tu es spécialisée dans la prise de rendez-vous et tu t'exprimes exclusivement en français. "
            f"Tu es professionnelle, courtoise et efficace. "
            f"\n\n"
            f"MISSION PRINCIPALE :\n"
            f"Aider les utilisateurs à prendre des rendez-vous rapidement et facilement."
            f"\n"
            f"FLUX DE CONVERSATION :\n"
            f"1. Accueil chaleureux et orientation immédiate vers la prise de RDV"
            f"2. Si l'utilisateur veut un RDV : demander sa préférence de timing"
            f"3. Consulter les disponibilités avec list_available_slots"
            f"4. Proposer des créneaux de manière naturelle (ex: 'lundi matin', 'mardi après-midi')"
            f"5. Une fois le créneau choisi, demander : nom complet et numéro de téléphone"
            f"6. Confirmer la réservation avec schedule_appointment"
            f"\n"
            f"RÈGLES IMPORTANTES :\n"
            f"- Toujours annoncer avant de consulter le calendrier : 'Un instant, je vérifie les disponibilités'"
            f"- Ne jamais lire toute la liste des créneaux : synthétiser en options générales"
            f"- Éviter les termes techniques (fuseaux horaires, timestamps, AM/PM)"
            f"- Collecter UNIQUEMENT le nom complet et le numéro de téléphone (PAS d'email)"
            f"- Rester naturel et conversationnel en français"
            f"- Si un créneau n'est plus disponible, proposer immédiatement des alternatives"
        )

    async def start(self, ctx: AgentSession) -> None:
        """Message d'accueil initial"""
        await super().start(ctx)
        await self.chat_ctx.say(
            "Bonjour ! Je suis Zora, votre assistante pour les rendez-vous. "
            "Souhaitez-vous réserver un créneau aujourd'hui ?",
            add_to_chat_ctx=False,
        )

    @function_tool
    async def schedule_appointment(
        self,
        ctx: RunContext[Userdata],
        slot_id: str,
        user_name: str,
        user_phone_number: str,
    ) -> str:
        """
        Réserver un rendez-vous avec les informations de l'utilisateur.
        
        Args:
            slot_id: L'identifiant du créneau sélectionné
            user_name: Le nom complet de l'utilisateur (prénom et nom)
            user_phone_number: Le numéro de téléphone de l'utilisateur
        """
        if not (slot := self._slots_map.get(slot_id)):
            raise ToolError(f"Erreur : le créneau {slot_id} n'a pas été trouvé")

        ctx.disallow_interruptions()
        
        try:
            # Générer un email temporaire pour Cal.com (requis par l'API)
            # Format: nom_prenom_timestamp@temp.zora24.ai
            name_clean = user_name.lower().replace(" ", "_").replace(".", "")
            timestamp = int(datetime.datetime.now().timestamp())
            temp_email = f"{name_clean}_{timestamp}@temp.zora24.ai"
            
            logger.info(f"📅 Tentative de réservation - Nom: {user_name}, Tél: {user_phone_number}")
            logger.info(f"📧 Email temporaire généré: {temp_email}")
            
            await ctx.userdata.cal.schedule_appointment(
                start_time=slot.start_time,
                attendee_email=temp_email,
                user_name=user_name,
            )
            
            # Formatage de la confirmation en français
            local = slot.start_time.astimezone(self.tz)
            appointment_details = local.strftime("%A %d %B %Y à %H:%M")
            
            confirmation_message = (
                f"Parfait {user_name} ! Votre rendez-vous est confirmé pour le "
                f"{appointment_details}. Nous avons bien noté votre numéro : {user_phone_number}. "
                f"À bientôt !"
            )
                
            logger.info(f"✅ Rendez-vous confirmé : {appointment_details}")
            return confirmation_message
            
        except SlotUnavailableError:
            raise ToolError("Ce créneau n'est malheureusement plus disponible. Puis-je vous proposer d'autres options ?")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la réservation: {e}")
            raise ToolError("Je rencontre un problème technique. Pouvez-vous réessayer dans un moment ?")

    @function_tool
    async def list_available_slots(
        self, 
        ctx: RunContext[Userdata], 
        range: Literal["+2week", "+1month", "+3month", "default"] = "default"
    ) -> str:
        """
        Lister les créneaux disponibles dans la période demandée.
        
        Format de retour : <slot_id> – <Jour>, <Date> à <Heure> (<relatif>)
        
        Args:
            range: Période de recherche des créneaux libres
        """
        now = datetime.datetime.now(self.tz)
        
        # Déterminer la période de recherche
        range_mapping = {
            "default": 14,
            "+2week": 14,
            "+1month": 30,
            "+3month": 90
        }
        range_days = range_mapping.get(range, 14)
        
        logger.info(f"🔍 Recherche des créneaux sur {range_days} jours")
        
        try:
            slots = await ctx.userdata.cal.list_available_slots(
                start_time=now, 
                end_time=now + datetime.timedelta(days=range_days)
            )
            
            if not slots:
                return "Aucun créneau n'est disponible pour le moment. Puis-je vous proposer une autre période ?"
            
            lines: list[str] = []
            
            for slot in slots[:20]:  # Limiter à 20 créneaux pour éviter la surcharge
                local = slot.start_time.astimezone(self.tz)
                delta = local - now
                days = delta.days
                
                # Calcul du temps relatif en français
                if local.date() == now.date():
                    if delta.seconds < 3600:
                        rel = "dans moins d'une heure"
                    else:
                        rel = "aujourd'hui"
                elif local.date() == (now.date() + datetime.timedelta(days=1)):
                    rel = "demain"
                elif days < 7:
                    rel = f"dans {days} jour{'s' if days > 1 else ''}"
                elif days < 14:
                    rel = "la semaine prochaine"
                else:
                    rel = f"dans {days // 7} semaine{'s' if days // 7 > 1 else ''}"

                lines.append(
                    f"{slot.unique_hash} – {local.strftime('%A %d %B %Y')} à "
                    f"{local.strftime('%H:%M')} ({rel})"
                )
                self._slots_map[slot.unique_hash] = slot

            logger.info(f"✅ {len(lines)} créneaux trouvés")
            return "\n".join(lines)
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la recherche des créneaux: {e}")
            return "Je rencontre une difficulté pour consulter le calendrier. Pouvez-vous réessayer ?"


def setup_langfuse(
    host: str | None = None, 
    public_key: str | None = None, 
    secret_key: str | None = None
):
    """Configuration optionnelle de Langfuse pour l'analyse des conversations"""
    try:
        from livekit.agents.telemetry import set_tracer_provider
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        import base64

        public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY")
        secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY")
        host = host or os.getenv("LANGFUSE_HOST")

        if not all([public_key, secret_key, host]):
            logger.info("⚠️ Langfuse non configuré (optionnel)")
            return

        langfuse_auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
        endpoint = f"{host.rstrip('/')}/api/public/otel"
        headers = {"Authorization": f"Basic {langfuse_auth}"}

        trace_provider = TracerProvider()
        exporter = OTLPSpanExporter(endpoint=endpoint, headers=headers)
        trace_provider.add_span_processor(BatchSpanProcessor(exporter))
        set_tracer_provider(trace_provider)
        
        logger.info("✅ Langfuse configuré avec succès")
    except ImportError:
        logger.warning("⚠️ Langfuse non disponible (packages manquants)")
    except Exception as e:
        logger.error(f"❌ Erreur configuration Langfuse: {e}")


async def entrypoint(ctx: JobContext):
    """Point d'entrée principal de l'agent Zora"""
    setup_langfuse()
    await ctx.connect()

    # Configuration française
    timezone = "Europe/Paris"

    # Configuration du calendrier par assistant
    assistant_id = os.getenv("ASSISTANT_ID")
    logger.info("🔧 Configuration du calendrier...")

    cal = None

    if assistant_id:
        logger.info(f"📋 Chargement config pour assistant: {assistant_id}")
        calcom_config = await get_assistant_calcom_config(assistant_id)

        if calcom_config and calcom_config.get('enabled', False):
            logger.info("✅ Configuration Cal.com trouvée et activée")
            cal = CalComCalendar(
                api_key=calcom_config['apiKey'],
                timezone=timezone,
                event_id=calcom_config.get('eventId')  # Utilise l'Event ID configuré
            )
        else:
            logger.info("ℹ️ Configuration Cal.com non trouvée ou désactivée")
    else:
        logger.warning("⚠️ ASSISTANT_ID non défini, vérification CAL_API_KEY legacy...")

    # Fallback vers l'ancienne méthode si pas de config par assistant
    if cal is None:
        cal_api_key = os.getenv("CAL_API_KEY")
        if cal_api_key:
            logger.info("📅 Mode legacy: CAL_API_KEY détecté")
            cal = CalComCalendar(api_key=cal_api_key, timezone=timezone)
        else:
            logger.warning("⚠️ Aucun calendrier configuré, utilisation du calendrier de test")
            cal = FakeCalendar(timezone=timezone)

    try:
        await cal.initialize()
        logger.info("✅ Calendrier initialisé")
    except Exception as e:
        logger.error(f"❌ Échec initialisation calendrier: {e}")
        logger.info("🔄 Basculement vers calendrier de test")
        cal = FakeCalendar(timezone=timezone)
        await cal.initialize()

    # Récupération du prompt personnalisé (optionnel)
    custom_prompt = os.getenv("ZORA_CUSTOM_PROMPT")
    
    # Configuration de la session
    session = AgentSession[Userdata](
        userdata=Userdata(cal=cal),
        preemptive_generation=True,
        stt=deepgram.STT(
            language="fr",  # Français exclusivement
            endpointing_ms=1000,
            punctuate=True,
            smart_format=True
        ),
        llm=openai.LLM(
            model="gpt-4o-mini", 
            parallel_tool_calls=False, 
            temperature=0.3  # Plus déterministe pour un comportement cohérent
        ),
        tts=elevenlabs.TTS(
            model="eleven_flash_v2_5",
            voice="CwhRBWXzGAHq8TQ4Fs17"  # Roger - voix masculine claire
        ),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
        max_tool_steps=3,  # Permettre plusieurs étapes pour les workflows complexes
    )

    # Collecteur de métriques
    usage_collector = metrics.UsageCollector()

    @session.on("new_chat_message")
    def on_new_chat_message(msg):
        print(f"[{msg.role.upper()}]: {msg.content}")

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        usage_collector.collect(ev.metrics)
        metrics.log_metrics(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"📊 Utilisation: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Démarrage de l'agent
    await session.start(
        agent=ZoraAgent(timezone=timezone, custom_prompt=custom_prompt), 
        room=ctx.room
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint, 
            agent_name="zora_agent"
        )
    )
