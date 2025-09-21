import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateAndPlayAudio } from "@/services/elevenLabsService";
import { useToast } from "@/hooks/use-toast";

interface Voice {
  id: string;
  name: string;
  description: string;
  language: string;
  provider: string;
  avatar?: string;
  isFree?: boolean;
}

const voices: Voice[] = [
  {
    id: "FpvROcY4IGWevepmBWO2",
    name: "Marie",
    description: "Voix féminine parfaite pour tous vos besoins",
    language: "Français",
    provider: "ElevenLabs",
  },
  {
    id: "kENkNtk0xyzG09WW40xE",
    name: "Louis",
    description: "Voix masculine chaleureuse, claire et conversationnelle",
    language: "Français",
    provider: "ElevenLabs",
  },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  testText?: string;
}

export default function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  testText = "Bonjour, je suis votre assistant virtuel",
}: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedVoiceData = voices.find((v) => v.name === selectedVoice);

  const handlePlayVoice = async (voiceId: string) => {
    setPlayingVoice(voiceId);

    try {
      console.log('[DEBUG] VoiceSelector: Testing voice', voiceId, 'with text:', testText);

      // Essayer d'abord avec le cache désactivé pour éviter les problèmes de cache corrompu
      const result = await generateAndPlayAudio(voiceId, testText, false);

      if (!result.success) {
        console.error('[DEBUG] VoiceSelector: Audio generation failed for voice', voiceId, ':', result.error);

        // Afficher des informations spécifiques selon le type d'erreur
        let errorMessage = result.error || "Impossible de générer l'audio";
        if (result.error?.includes("quota")) {
          errorMessage = "Quota ElevenLabs dépassé pour cette voix";
        } else if (result.error?.includes("invalid") || result.error?.includes("not found")) {
          errorMessage = "Cette voix n'est plus disponible";
        } else if (result.error?.includes("rate limit")) {
          errorMessage = "Limite de taux atteinte, veuillez réessayer plus tard";
        }

        toast({
          title: "Erreur audio",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        console.log('[DEBUG] VoiceSelector: Audio test successful for voice', voiceId);
        toast({
          title: "Test réussi",
          description: "L'audio a été joué avec succès",
        });
      }
    } catch (error: any) {
      console.error('[DEBUG] VoiceSelector: Audio test error for voice', voiceId, ':', error);

      let errorMessage = error.message || "Impossible de lire l'audio";
      if (error.message?.includes("Permission")) {
        errorMessage = "Permission audio refusée. Cliquez à nouveau pour autoriser.";
      } else if (error.message?.includes("NotSupported")) {
        errorMessage = "Format audio non supporté par votre navigateur.";
      }

      toast({
        title: "Erreur audio",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPlayingVoice(null);
    }
  };

  const handleSelectVoice = (voice: Voice) => {
    onVoiceChange(voice.name);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-auto p-4"
        >
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {selectedVoiceData?.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="font-medium">{selectedVoiceData?.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedVoiceData?.description}
              </div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir une voix</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedVoice === voice.name
                ? "border-accent bg-accent/5"
                : "border-border hover:bg-muted/50"
                }`}
              onClick={() => handleSelectVoice(voice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {voice.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span>{voice.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {voice.language}
                      </Badge>
                      {voice.isFree && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Gratuite
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {voice.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayVoice(voice.id);
                    }}
                    disabled={playingVoice === voice.id}
                  >
                    {playingVoice === voice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  {selectedVoice === voice.name && (
                    <Check className="h-4 w-4 text-accent" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}