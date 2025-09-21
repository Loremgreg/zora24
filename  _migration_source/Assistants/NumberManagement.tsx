import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, ShoppingCart, Info, Loader2, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  country: string;
  price: number;
  capabilities?: any;
}

interface AssignedNumber {
  id: string;
  e164: string;
  country: string;
  twilio_sid?: string;
  assistant_id: string;
  monthly_cost?: number;
  status: string;
}

export default function NumberManagement({ assistantId }: { assistantId: string }) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [assignedNumber, setAssignedNumber] = useState<AssignedNumber | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<PhoneNumber[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { toast } = useToast();

  // Load assigned number on component mount
  useEffect(() => {
    if (assistantId) {
      loadAssignedNumber();
    }
  }, [assistantId]);

  const loadAssignedNumber = async () => {
    if (!assistantId) {
      console.log("No assistant ID provided");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('assistant_id', assistantId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error loading assigned number:', error);
        return;
      }

      setAssignedNumber(data);
    } catch (error) {
      console.error('Error loading assigned number:', error);
    }
  };

  const searchAvailableNumbers = async (country: string) => {
    setIsLoading(true);
    try {
      console.log(`Searching numbers for country: ${country}`);
      const { data, error } = await supabase.functions.invoke('search-phone-numbers', {
        body: {
          assistant_id: assistantId,
          country_code: country
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Function response:', data);
      setAvailableNumbers(data.numbers || []);
    } catch (error) {
      console.error('Error searching numbers:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les numéros disponibles pour ${country}. Vérifiez la configuration Twilio.`,
        variant: "destructive",
      });
      setAvailableNumbers([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    searchAvailableNumbers(country);
  };

  const handlePurchaseNumber = async (phoneNumber: string) => {
    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-phone-number', {
        body: {
          phoneNumber,
          assistantId
        }
      });

      if (error) throw error;

      if (data.success) {
        setAssignedNumber(data.phoneNumber);
        setShowPurchaseModal(false);
        toast({
          title: "Succès",
          description: "Numéro acheté et assigné avec succès",
        });
      }
    } catch (error) {
      console.error('Error purchasing number:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'acheter le numéro",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Numéro de téléphone</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Assignez un numéro entrant à votre assistant pour qu'il puisse recevoir des appels.
          </p>
        </CardHeader>
        <CardContent>
          {assignedNumber ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="font-medium">{assignedNumber.e164}</div>
                  <div className="text-sm text-muted-foreground">
                    {assignedNumber.country} • ${assignedNumber.monthly_cost}/mois
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success">
                Assigné
              </Badge>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun numéro assigné</h3>
              <p className="text-muted-foreground mb-4">
                Achetez ou assignez un numéro pour que votre assistant puisse recevoir des appels.
              </p>
              <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary-hover">
                    <Plus className="mr-2 h-4 w-4" />
                    Acheter un numéro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Choisir un numéro</DialogTitle>
                  </DialogHeader>

                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-accent mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-accent mb-1">
                          Information importante
                        </p>
                        <p className="text-muted-foreground">
                          Les numéros sont achetés directement depuis Twilio. Vous serez facturé mensuellement.
                        </p>
                        <p className="text-muted-foreground mt-2">
                          Le numéro sera automatiquement configuré pour recevoir des appels via votre assistant.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Pays</label>
                      <Select value={selectedCountry} onValueChange={handleCountryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">États-Unis</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="BE">Belgique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Recherche de numéros...</p>
                      </div>
                    ) : availableNumbers.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableNumbers.map((number) => (
                          <div
                            key={number.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {number.country}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{number.number}</div>
                                <div className="text-sm text-muted-foreground flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{number.locality}, {number.region}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="font-medium flex items-center">
                                  <DollarSign className="h-3 w-3" />
                                  {number.price}/mois
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePurchaseNumber(number.number)}
                                disabled={isPurchasing}
                                className="bg-primary hover:bg-primary-hover"
                              >
                                {isPurchasing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Acheter
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Sélectionnez un pays pour voir les numéros disponibles
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
