# Résumé Exécutif : Architecture d'Intégration TheFork pour Zora

## Vue d'Ensemble de la Solution

Cette proposition présente une architecture robuste et évolutive pour intégrer l'API TheFork dans l'assistant vocal Zora, permettant la réservation de restaurants en temps réel tout en préparant l'ajout futur d'autres plateformes de réservation.

## Réponses aux Questions Clés

### 1. Structure du Code

**Organisation modulaire proposée :**
```
restaurant_booking/
├── protocols.py          # Interfaces communes
├── models.py            # Modèles de données partagés
├── exceptions.py        # Exceptions spécifiques
├── providers/
│   ├── base.py         # Classe abstraite de base
│   ├── thefork.py      # Implémentation TheFork
│   └── fake.py         # Implémentation de test
└── auth/
    ├── oauth2.py       # Gestionnaire OAuth2 générique
    └── token_manager.py # Gestion du cycle de vie des tokens
```

**Placement :** Au même niveau que [`calendar_api.py`](calendar_api.py), respectant l'architecture existante.

### 2. Interaction avec l'Agent

**Extension de [`ZoraAgent`](zora_agent.py) avec de nouvelles fonctions-outils :**

```python
@function_tool
async def check_restaurant_availability(
    self, ctx: RunContext[Userdata],
    date: str, time: str, party_size: int = 2
) -> str:
    """Vérifier les disponibilités du restaurant configuré"""

@function_tool
async def book_restaurant_table(
    self, ctx: RunContext[Userdata],
    slot_id: str, user_name: str, user_phone: str,
    user_email: str, party_size: int
) -> str:
    """Réserver une table dans LE restaurant configuré"""
```

**Intégration naturelle :** L'agent utilise un [`RestaurantBookingManager`](restaurant_booking/__init__.py) unifié, configuré pour UN restaurant spécifique, similaire au pattern existant avec [`CalComCalendar`](calendar_api.py:100).

### 3. Séparation des Responsabilités

**Architecture en couches bien définies :**

- **ZoraAgent** : Logique conversationnelle et orchestration
- **RestaurantBookingManager** : Interface unifiée, gestion des erreurs métier
- **TheForkProvider** : Logique spécifique TheFork, mapping des données
- **OAuth2Manager** : Authentification OAuth2 générique et réutilisable
- **TokenManager** : Cycle de vie des tokens (cache, renouvellement automatique)

**Isolation complète :** La logique technique TheFork reste encapsulée dans son provider, sans contaminer la logique métier de l'agent.

### 4. Gestion de l'État et de la Configuration

**Configuration sécurisée :**
- **Variables d'environnement** pour les credentials (jamais en dur dans le code)
- **Configuration par assistant** via Supabase (comme Cal.com existant)
- **Fallback global** pour la compatibilité

**Gestion automatique des tokens :**
```python
class TokenManager:
    async def get_valid_token(self) -> str:
        """Retourne un token valide, le renouvelle automatiquement si nécessaire"""
        async with self._lock:
            if self._is_token_expired():
                await self._refresh_token()
            return self._token_cache['access_token']
```

**Cycle de vie complet :** Demande initiale, stockage sécurisé en mémoire, détection d'expiration, renouvellement automatique.

### 5. Évolutivité

**Architecture extensible par design :**

```python
class RestaurantProvider(Protocol):
    """Interface commune pour tous les fournisseurs"""
    async def get_restaurant_info() -> Restaurant: ...
    async def get_availabilities(...) -> list[BookingSlot]: ...
    async def create_reservation(...) -> Reservation: ...
```

**Factory Pattern pour l'ajout facile de nouveaux providers :**
```python
providers = {
    'thefork': TheForkProvider,
    'zenchef': ZenchefProvider,  # Futur
    'fake': FakeRestaurantProvider
}
```

**Ajout de Zenchef (exemple) :** Créer [`providers/zenchef.py`](restaurant_booking/providers/zenchef.py), implémenter l'interface, enregistrer dans la factory. **Aucune modification** de [`zora_agent.py`](zora_agent.py) requise !

## Avantages Clés de cette Architecture

### ✅ Robustesse
- **Gestion centralisée des erreurs** avec messages utilisateur appropriés
- **Authentification sécurisée** avec renouvellement automatique des tokens
- **Fallback vers provider de test** en cas de problème

### ✅ Maintenabilité
- **Séparation claire des responsabilités** entre les couches
- **Code réutilisable** entre différents providers
- **Tests unitaires facilités** par l'architecture modulaire

### ✅ Évolutivité
- **Interface unifiée** permettant l'ajout facile de nouveaux providers
- **Configuration flexible** par assistant ou globale
- **Patterns cohérents** avec l'architecture existante

### ✅ Sécurité
- **Secrets jamais exposés** dans le code source
- **Tokens en mémoire uniquement** (pas de persistance sur disque)
- **Communications HTTPS** obligatoires
- **Validation des entrées** utilisateur

## Fonctionnalités Couvertes

Basé sur votre spécification, l'architecture couvre tous les endpoints TheFork requis :

**Disponibilités du restaurant configuré :**
- GET `/v1/restaurants/{restaurant_id}/availabilities`
- GET `/v1/restaurants/{restaurant_id}/timeslots`
- GET `/v1/restaurants/{restaurant_id}/partysizes`
- GET `/v1/restaurants/{restaurant_id}/offers`

**Gestion des réservations :**
- POST `/v1/restaurants/{restaurant_id}/reservations` (création)
- GET `/v1/reservations/{id}` (consultation)
- PATCH `/v1/reservations/{id}` (modification)
- PATCH `/v1/reservations/{id}/cancel` (annulation)

**Modèle métier :** Un assistant = Un restaurant. L'ID du restaurant est configuré dans Supabase pour chaque assistant.

## Plan d'Implémentation Recommandé

### Phase 1 : Fondations (1-2 semaines)
- Structure de modules et modèles de données
- Interface `RestaurantProvider` et `FakeProvider` pour tests

### Phase 2 : Authentification (1 semaine)
- `OAuth2Manager` et `TokenManager` avec cache
- Tests d'authentification TheFork

### Phase 3 : Provider TheFork (2-3 semaines)
- Implémentation complète `TheForkProvider`
- Mapping des endpoints API et gestion d'erreurs

### Phase 4 : Intégration Agent (1-2 semaines)
- Extension `ZoraAgent` avec nouvelles fonctions
- Tests d'intégration complets

### Phase 5 : Configuration UI (1-2 semaines)
- Interface de configuration dans le frontend
- Fonctions Supabase Edge pour la gestion des configs

## Conclusion

Cette architecture offre une solution complète, robuste et évolutive pour l'intégration TheFork. Elle respecte les patterns existants du projet Zora tout en préparant l'avenir avec d'autres plateformes de réservation.

**Prêt pour l'implémentation :** Tous les détails techniques, diagrammes et spécifications sont fournis pour permettre un développement efficace.

**Évolutif par design :** L'ajout de nouvelles plateformes (Zenchef, etc.) se fera sans friction et sans modification de la logique principale de l'agent.

---

**Documents de référence :**
- [`ARCHITECTURE_THEFORK_INTEGRATION.md`](ARCHITECTURE_THEFORK_INTEGRATION.md) - Spécifications techniques détaillées
- [`THEFORK_SEQUENCE_DIAGRAM.md`](THEFORK_SEQUENCE_DIAGRAM.md) - Diagrammes d'architecture et flux