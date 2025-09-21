import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateAssistantModal({
  open,
  onOpenChange
}: CreateAssistantModalProps) {
  const [assistantName, setAssistantName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!assistantName.trim()) return;

    setIsCreating(true);
    try {
      // Créer l'assistant dans la base de données
      const { data, error } = await supabase
        .from('assistants')
        .insert({
          name: assistantName.trim(),
          voice_id: "WQKwBV2Uzw1gSGr69N8I", // Anna par défaut
          start_message: "Bonjour, comment puis-je vous aider aujourd'hui ?",
          prompt: `Vous êtes ${assistantName.trim()}, un assistant téléphonique professionnel et bienveillant.

Votre rôle:
- Accueillir chaleureusement les appelants
- Répondre aux questions de base
- Prendre des messages détaillés si nécessaire
- Transférer les appels urgents vers la bonne personne

Comportement:
- Toujours poli et professionnel
- Écouter attentivement avant de répondre
- Demander des clarifications si nécessaire
- Confirmer les informations importantes`,
          user_id: "temp-user-id" // TODO: Remplacer par auth().userId de Clerk lors de la migration
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-créer sous-compte Twilio pour l'assistant
      try {
        console.log('Creating Twilio subaccount for assistant:', data.id);
        const { data: subaccountData, error: subaccountError } = await supabase.functions.invoke('create-twilio-subaccount', {
          body: {
            assistant_id: data.id,
            friendlyName: `Assistant ${assistantName.trim()}`
          }
        });

        if (subaccountError) {
          console.warn('Subaccount creation failed:', subaccountError);
          // Ne pas bloquer la création d'assistant si sous-compte échoue
        } else {
          console.log('Subaccount created successfully:', subaccountData);
        }
      } catch (subaccountError) {
        console.warn('Subaccount creation error:', subaccountError);
        // Ne pas bloquer la création d'assistant
      }

      toast({
        title: "Assistant créé",
        description: `${assistantName} a été créé avec succès`,
      });

      onOpenChange(false);
      navigate(`/assistants/${data.id}`);
      setAssistantName("");
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'assistant",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setAssistantName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un Assistant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              placeholder="Nom de l'assistant"
              value={assistantName}
              onChange={e => setAssistantName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!assistantName.trim() || isCreating}
            className="bg-primary hover:bg-primary-hover"
          >
            {isCreating ? "Création..." : "Créer un Assistant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}