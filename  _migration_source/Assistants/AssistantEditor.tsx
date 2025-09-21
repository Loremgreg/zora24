import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Volume2, Plus, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import VoiceSelector from "./VoiceSelector";
import PromptTemplates from "./PromptTemplates";
import NumberManagement from "./NumberManagement";
import ToolsManagement from "./ToolsManagement";
import { generateAndPlayAudio } from "@/services/elevenLabsService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AssistantEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("behavior");
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [assistantData, setAssistantData] = useState({
    name: "",
    voice: "Anna",
    startMessage: "",
    prompt: ""
  });

  // Charger les données de l'assistant
  useEffect(() => {
    if (id) {
      loadAssistantData();
    }
  }, [id]);

  const loadAssistantData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Convertir voice_id en nom de voix
      const voiceIdToName: { [key: string]: string } = {
        "FpvROcY4IGWevepmBWO2": "Marie",
        "kENkNtk0xyzG09WW40xE": "Louis"
      };

      setAssistantData({
        name: data.name || "",
        voice: voiceIdToName[data.voice_id] || "Anna",
        startMessage: data.start_message || "",
        prompt: data.prompt || ""
      });
    } catch (error) {
      console.error('Error loading assistant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de l'assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Find the ElevenLabs voice ID for the selected voice
  const getVoiceId = (voiceName: string) => {
    const voiceMap: { [key: string]: string } = {
      "Marie": "FpvROcY4IGWevepmBWO2",
      "Louis": "kENkNtk0xyzG09WW40xE"
    };
    return voiceMap[voiceName] || "FpvROcY4IGWevepmBWO2"; // default to Marie
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      const voiceId = getVoiceId(assistantData.voice);

      const { error } = await supabase
        .from('assistants')
        .update({
          name: assistantData.name,
          voice_id: voiceId,
          start_message: assistantData.startMessage,
          prompt: assistantData.prompt
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Assistant sauvegardé",
        description: "Les modifications ont été enregistrées avec succès",
      });
    } catch (error) {
      console.error('Error saving assistant:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'assistant",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAudio = async () => {
    setIsTestingAudio(true);

    try {
      const voiceId = getVoiceId(assistantData.voice);
      const result = await generateAndPlayAudio(voiceId, assistantData.startMessage);

      if (!result.success) {
        toast({
          title: "Erreur audio",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur audio",
        description: "Impossible de tester l'audio",
        variant: "destructive",
      });
    } finally {
      setIsTestingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Chargement de l'assistant...</span>
        </div>
      </div>
    );
  }

  return <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/assistants")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Assistant</h1>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
        <Button variant="outline" onClick={handleTestAudio} disabled={isTestingAudio} className="w-full sm:w-auto">
          <Volume2 className="mr-2 h-4 w-4" />
          {isTestingAudio ? "Test en cours..." : "Test Audio"}
        </Button>
        <Button onClick={() => setActiveTab("call")} className="w-full sm:w-auto">
          Attribuer un Numéro
        </Button>
      </div>
    </div>

    {/* Tabs */}
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="behavior" className="text-xs sm:text-sm">Configuration</TabsTrigger>
        <TabsTrigger value="call" className="text-xs sm:text-sm">Appel</TabsTrigger>
        <TabsTrigger value="tools" className="text-xs sm:text-sm">Outils</TabsTrigger>
        <TabsTrigger value="postprocessing" className="text-xs sm:text-sm">Post-appel</TabsTrigger>
      </TabsList>

      <TabsContent value="behavior" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comportement</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configurez le nom, la voix et le comportement de votre assistant.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={assistantData.name} onChange={e => setAssistantData({
                ...assistantData,
                name: e.target.value
              })} />
            </div>

            {/* Voice */}
            <div className="space-y-2">
              <Label>Voix</Label>
              <VoiceSelector
                selectedVoice={assistantData.voice}
                onVoiceChange={voice => setAssistantData({
                  ...assistantData,
                  voice
                })}
                testText={assistantData.startMessage}
              />
            </div>

            {/* Start Message */}
            <div className="space-y-2">
              <Label htmlFor="startMessage">Message d'accueil</Label>
              <p className="text-sm text-muted-foreground">
                C'est le message fixe qui est envoyé au début de la conversation. Veillez à ce qu'il soit court et concis afin que l'appelant ne pense pas qu'il est tombé sur une messagerie vocale.
              </p>
              <Textarea
                id="startMessage"
                placeholder="Message que l'assistant dira en décrochant..."
                value={assistantData.startMessage}
                onChange={e => setAssistantData({
                  ...assistantData,
                  startMessage: e.target.value
                })}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleTestAudio} disabled={isTestingAudio} className="w-full sm:w-auto">
                  <Play className="mr-2 h-3 w-3" />
                  {isTestingAudio ? "Test en cours..." : "Tester audio"}
                </Button>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt">Instructions (Prompt)</Label>
                <PromptTemplates onSelectTemplate={template => setAssistantData({
                  ...assistantData,
                  prompt: template
                })} />
              </div>
              <Textarea id="prompt" placeholder="Instructions détaillées pour votre assistant..." value={assistantData.prompt} onChange={e => setAssistantData({
                ...assistantData,
                prompt: e.target.value
              })} className="min-h-[200px]" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="call">
        <NumberManagement assistantId={id || ""} />
      </TabsContent>

      <TabsContent value="tools">
        <ToolsManagement assistantId={id} />
      </TabsContent>

      <TabsContent value="postprocessing">
        <Card>
          <CardHeader>
            <CardTitle>Post-appel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configuration du traitement après appel.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Fonctionnalités de post-traitement à venir...
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Save button at bottom */}
    <div className="flex justify-end pt-6 border-t">
      <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sauvegarde...
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </div>
  </div>;
}
