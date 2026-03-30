import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAddressCep, BRAZILIAN_STATES } from "@/hooks/useAddressCep";

interface AddressFieldsProps {
  postal_code: string;
  country: string;
  street: string;
  city: string;
  state: string;
  onChange: (fields: Partial<{ postal_code: string; country: string; street: string; city: string; state: string }>) => void;
}

export default function AddressFields({ postal_code, country, street, city, state, onChange }: AddressFieldsProps) {
  const { cepLoading, debouncedFetchCep, cities, citiesLoading, fetchCities } = useAddressCep();

  // Load cities when state changes
  useEffect(() => {
    if (state && state.length === 2) {
      fetchCities(state);
    }
  }, [state, fetchCities]);

  const handleCepChange = (value: string) => {
    onChange({ postal_code: value });
    debouncedFetchCep(value, (result) => {
      onChange({
        postal_code: value,
        street: result.street || "",
        city: result.city || "",
        state: result.state || "",
        country: result.country || "Brasil",
      });
      // Fetch cities for the state returned by CEP
      if (result.state) fetchCities(result.state);
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CEP</Label>
          <div className="relative">
            <Input
              value={postal_code}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
            />
            {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2">
          <Label>País</Label>
          <Input value={country} onChange={(e) => onChange({ country: e.target.value })} placeholder="Brasil" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input value={street} onChange={(e) => onChange({ street: e.target.value })} placeholder="Rua, número, bairro" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={state || "__none__"} onValueChange={(v) => {
            const uf = v === "__none__" ? "" : v;
            onChange({ state: uf, city: "" });
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione</SelectItem>
              {BRAZILIAN_STATES.map((s) => (
                <SelectItem key={s.uf} value={s.uf}>{s.name} ({s.uf})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          {cities.length > 0 ? (
            <Select value={city || "__none__"} onValueChange={(v) => onChange({ city: v === "__none__" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder={citiesLoading ? "Carregando..." : "Selecione a cidade"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={city} onChange={(e) => onChange({ city: e.target.value })} placeholder={state ? "Carregando cidades..." : "Selecione o estado primeiro"} />
          )}
        </div>
      </div>
    </>
  );
}
