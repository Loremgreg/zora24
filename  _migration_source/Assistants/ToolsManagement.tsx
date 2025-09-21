import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Eye, EyeOff, Check, X, TestTube, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Interface pour définir la structure d'un outil Cal.com
interface CalcomTool {
  id: string;
  name: string;
  description: string;
  apiKey: string;
  eventId: string;
  calendarName: string;
  permissions: 'view_only' | 'view_and_book';
  confirmationType: 'sms' | 'email';
  enabled: boolean;
}

interface ToolsManagementProps {
  assistantId?: string;
}

export default function ToolsManagement({ assistantId }: ToolsManagementProps) {
  const { toast } = useToast();
  
  // État pour gérer l'outil Cal.com
  const [calcomTool, setCalcomTool] = useState<CalcomTool>({
    id: 'calcom-1',
    name: 'Cal.com',
    description: 'Outil de prise de rendez-vous via Cal.com',
    apiKey: '',
    eventId: '',
    calendarName: '',
    permissions: 'view_and_book',
    confirmationType: 'sms',
    enabled: false
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editApiKey, setEditApiKey] = useState('');
  const [editEventId, setEditEventId] = useState('');
  const [editCalendarName, setEditCalendarName] = useState('');
  const [editPermissions, setEditPermissions] = useState<'view_only' | 'view_and_book'>('view_and_book');
  const [editConfirmationType, setEditConfirmationType] = useState<'sms' | 'email'>('sms');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Charger la configuration au montage du composant
  useEffect(() => {
    if (assistantId) {
      loadCalcomConfig();
    }
  }, [assistantId]);

  // Fonction pour charger la configuration Cal.com
  const loadCalcomConfig = async () => {
    if (!assistantId) return;
    
    // Vérifier si l'ID est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assistantId)) {
      console.warn('Invalid assistant ID format:', assistantId);
      toast({
        title: "Attention",
        description: "Veuillez d'abord créer et sauvegarder votre assistant avant de configurer les outils.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('get-assistant-calcom-config', {
        body: { assistantId }
      });

      // Vérifier si la réponse est en erreur
      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du chargement de la configuration');
      }

      const { data } = response;
      if (data?.calcomConfig) {
        setCalcomTool(prev => ({
          ...prev,
          ...data.calcomConfig
        }));
      }
    } catch (error) {
      console.error('Error loading Cal.com config:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration Cal.com",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour tester la connexion Cal.com
  const testCalcomConnection = async () => {
    if (!editApiKey) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir la clé API Cal.com",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await supabase.functions.invoke('test-calcom-connection', {
        body: { 
          apiKey: editApiKey,
          ...(editEventId && { eventId: editEventId })
        }
      });

      // Vérifier si la réponse est en erreur
      if (response.error) {
        throw new Error(response.error.message || 'Test de connexion échoué');
      }

      const { data } = response;
      if (!data?.success) {
        throw new Error(data?.details || 'Test de connexion échoué');
      }

      toast({
        title: "Connexion réussie !",
        description: `Connecté à Cal.com pour ${data.user?.name || data.user?.username || 'utilisateur'}`,
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: "Test de connexion échoué",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Fonction pour gérer la sauvegarde de la configuration
  const handleSave = async () => {
    if (!assistantId) {
      toast({
        title: "Erreur",
        description: "ID de l'assistant manquant",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si l'ID est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assistantId)) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Veuillez d'abord créer et sauvegarder votre assistant avant de configurer les outils.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const calcomConfig = {
        apiKey: editApiKey,
        eventId: editEventId,
        calendarName: editCalendarName,
        permissions: editPermissions,
        confirmationType: editConfirmationType,
        enabled: calcomTool.enabled
      };

      const response = await supabase.functions.invoke('save-assistant-calcom-config', {
        body: { 
          assistantId,
          calcomConfig
        }
      });

      // Vérifier si la réponse est en erreur
      if (response.error) {
        throw new Error(response.error.message || 'Sauvegarde échouée');
      }

      const { data } = response;
      if (!data?.success) {
        throw new Error(data?.details || 'Sauvegarde échouée');
      }

      setCalcomTool(prev => ({
        ...prev,
        ...calcomConfig
      }));
      
      setIsEditing(false);
      
      toast({
        title: "Configuration sauvegardée",
        description: "La configuration Cal.com a été mise à jour avec succès",
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour basculer l'état enabled/disabled de l'outil
  const handleToggle = async (enabled: boolean) => {
    if (!assistantId) return;

    // Vérifier si l'ID est un UUID valide avant de faire l'appel
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assistantId)) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord créer et sauvegarder votre assistant avant de configurer les outils.",
        variant: "destructive",
      });
      return;
    }

    const updatedTool = { ...calcomTool, enabled };
    setCalcomTool(updatedTool);

    try {
      const response = await supabase.functions.invoke('save-assistant-calcom-config', {
        body: { 
          assistantId,
          calcomConfig: updatedTool
        }
      });

      // Vérifier si la réponse est en erreur
      if (response.error) {
        throw new Error(response.error.message || 'Mise à jour échouée');
      }

      const { data } = response;
      if (!data?.success) {
        throw new Error(data?.details || 'Mise à jour échouée');
      }

      toast({
        title: enabled ? "Outil activé" : "Outil désactivé",
        description: `Cal.com ${enabled ? 'activé' : 'désactivé'} pour cet assistant`,
      });
    } catch (error) {
      console.error('Toggle failed:', error);
      // Revert the change
      setCalcomTool(prev => ({ ...prev, enabled: !enabled }));
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fonction pour démarrer l'édition
  const startEditing = () => {
    setEditApiKey(calcomTool.apiKey);
    setEditEventId(calcomTool.eventId);
    setEditCalendarName(calcomTool.calendarName);
    setEditPermissions(calcomTool.permissions);
    setEditConfirmationType(calcomTool.confirmationType);
    setIsEditing(true);
  };

  // Fonction pour masquer la clé API
  const maskApiKey = (key: string) => {
    if (!key || key.length <= 8) return key;
    return key.substring(0, 8) + 'x'.repeat(key.length - 8);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de la configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Outils</h2>
          <p className="text-muted-foreground">
            Configurez les outils disponibles pour votre assistant
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un outil
        </Button>
      </div>

      {/* Outil Cal.com */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{calcomTool.name}</CardTitle>
              <CardDescription>{calcomTool.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={calcomTool.enabled ? "default" : "secondary"}>
              {calcomTool.enabled ? "Activé" : "Désactivé"}
            </Badge>
            <Switch
              checked={calcomTool.enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Clé API</Label>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {calcomTool.apiKey ? maskApiKey(calcomTool.apiKey) : 'Non configurée'}
                </span>
                {calcomTool.apiKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Event ID</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {calcomTool.eventId || 'Non configuré'}
              </p>
            </div>
          </div>

          {calcomTool.calendarName && (
            <div>
              <Label className="text-sm font-medium">Nom du calendrier</Label>
              <p className="text-sm text-muted-foreground mt-1">{calcomTool.calendarName}</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={startEditing}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configuration Cal.com</DialogTitle>
                  <DialogDescription>
                    Modifiez les paramètres de votre intégration Cal.com.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">Clé API Cal.com *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      placeholder="cal_live_xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventId">Event ID *</Label>
                    <Input
                      id="eventId"
                      value={editEventId}
                      onChange={(e) => setEditEventId(e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calendarName">Nom du calendrier</Label>
                    <Input
                      id="calendarName"
                      value={editCalendarName}
                      onChange={(e) => setEditCalendarName(e.target.value)}
                      placeholder="Consultation générale"
                    />
                  </div>
                  <div>
                    <Label htmlFor="permissions">Permissions</Label>
                    <Select value={editPermissions} onValueChange={(value: 'view_only' | 'view_and_book') => setEditPermissions(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view_only">Affichage uniquement</SelectItem>
                        <SelectItem value="view_and_book">Affichage et réservation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="confirmationType">Type de confirmation</Label>
                    <Select value={editConfirmationType} onValueChange={(value: 'sms' | 'email') => setEditConfirmationType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS (recommandé)</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={testCalcomConnection}
                      disabled={isTesting || !editApiKey}
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Tester
                    </Button>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                      <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Sauvegarder
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Message si aucun outil n'est configuré */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Plus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun autre outil configuré</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Ajoutez des outils pour étendre les capacités de votre assistant
          </p>
          <Button variant="outline">
            Parcourir les outils disponibles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}