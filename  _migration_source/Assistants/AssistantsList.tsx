
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, MoreHorizontal, Settings, Bot, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateAssistantModal from "./CreateAssistantModal";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Assistant {
  id: string;
  name: string;
  user_id: string;
  voice_id: string;
  start_message?: string;
  prompt?: string;
  created_at: string;
  phoneNumber?: string;
  status?: string;
}

export default function AssistantsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assistantToDelete, setAssistantToDelete] = useState<Assistant | null>(null);
  const navigate = useNavigate();

  // Récupérer les assistants depuis Supabase
  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      setIsLoading(true);
      console.log('Loading assistants from database...');

      // Récupérer tous les assistants (RLS désactivé)
      const { data: assistantsData, error: assistantsError } = await supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });

      if (assistantsError) {
        console.error('Error loading assistants:', assistantsError);
        return;
      }

      console.log('Assistants loaded:', assistantsData);

      // Récupérer les numéros de téléphone associés
      const { data: phoneNumbers, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('status', 'active');

      if (phoneError) {
        console.error('Error loading phone numbers:', phoneError);
      }

      // Associer les numéros aux assistants
      const assistantsWithPhones = assistantsData?.map(assistant => {
        const phone = phoneNumbers?.find(p => p.assistant_id === assistant.id);
        return {
          ...assistant,
          phoneNumber: phone?.e164 || 'Aucun numéro',
          status: phone ? 'active' : 'inactive'
        };
      }) || [];

      setAssistants(assistantsWithPhones);
    } catch (error) {
      console.error('Error in loadAssistants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssistants = assistants.filter((assistant) =>
    assistant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditAssistant = (assistantId: string) => {
    navigate(`/assistants/${assistantId}`);
  };

  const handleDeleteAssistant = (assistant: Assistant) => {
    setAssistantToDelete(assistant);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAssistant = async () => {
    if (!assistantToDelete) return;

    try {
      console.log('Deleting assistant:', assistantToDelete.id);

      // Supprimer l'assistant de la base de données
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantToDelete.id);

      if (error) {
        console.error('Error deleting assistant:', error);
        return;
      }

      // Actualiser la liste des assistants
      await loadAssistants();
      
      setDeleteDialogOpen(false);
      setAssistantToDelete(null);
    } catch (error) {
      console.error('Error in confirmDeleteAssistant:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assistants</h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary-hover"
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer un Assistant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Chargement des assistants...</p>
              </div>
            </div>
          ) : filteredAssistants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun assistant créé</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Vous n'avez pas encore créé d'assistant. Créez votre premier assistant pour commencer.
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer mon premier assistant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Numéro de téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssistants.map((assistant) => (
                  <TableRow key={assistant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {assistant.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span>{assistant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assistant.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${assistant.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {assistant.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditAssistant(assistant.id)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteAssistant(assistant)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAssistantModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'assistant</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'assistant "{assistantToDelete?.name}" ? 
              Cette action est irréversible et supprimera également tous les numéros de téléphone associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAssistant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
