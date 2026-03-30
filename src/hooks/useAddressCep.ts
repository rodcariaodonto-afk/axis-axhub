import { useState, useCallback, useRef, useEffect } from "react";

export const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" }, { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

export const COUNTRIES = [
  "Afeganistão","África do Sul","Albânia","Alemanha","Andorra","Angola","Antígua e Barbuda",
  "Arábia Saudita","Argélia","Argentina","Armênia","Austrália","Áustria","Azerbaijão",
  "Bahamas","Bahrein","Bangladesh","Barbados","Bélgica","Belize","Benin","Bielorrússia",
  "Bolívia","Bósnia e Herzegovina","Botsuana","Brasil","Brunei","Bulgária","Burkina Faso",
  "Burundi","Butão","Cabo Verde","Camarões","Camboja","Canadá","Catar","Cazaquistão",
  "Chade","Chile","China","Chipre","Colômbia","Comores","Congo","Coreia do Norte",
  "Coreia do Sul","Costa do Marfim","Costa Rica","Croácia","Cuba","Dinamarca","Djibuti",
  "Dominica","Egito","El Salvador","Emirados Árabes Unidos","Equador","Eritreia","Eslováquia",
  "Eslovênia","Espanha","Estados Unidos","Estônia","Eswatini","Etiópia","Fiji","Filipinas",
  "Finlândia","França","Gabão","Gâmbia","Gana","Geórgia","Granada","Grécia","Guatemala",
  "Guiana","Guiné","Guiné Equatorial","Guiné-Bissau","Haiti","Holanda","Honduras","Hungria",
  "Iêmen","Ilhas Marshall","Ilhas Salomão","Índia","Indonésia","Irã","Iraque","Irlanda",
  "Islândia","Israel","Itália","Jamaica","Japão","Jordânia","Kiribati","Kuwait","Laos",
  "Lesoto","Letônia","Líbano","Libéria","Líbia","Liechtenstein","Lituânia","Luxemburgo",
  "Macedônia do Norte","Madagáscar","Malásia","Malaui","Maldivas","Mali","Malta","Marrocos",
  "Maurício","Mauritânia","México","Mianmar","Micronésia","Moçambique","Moldávia","Mônaco",
  "Mongólia","Montenegro","Namíbia","Nauru","Nepal","Nicarágua","Níger","Nigéria","Noruega",
  "Nova Zelândia","Omã","Palau","Palestina","Panamá","Papua Nova Guiné","Paquistão","Paraguai",
  "Peru","Polônia","Portugal","Quênia","Quirguistão","Reino Unido","República Centro-Africana",
  "República Democrática do Congo","República Dominicana","República Tcheca","Romênia","Ruanda",
  "Rússia","Samoa","San Marino","Santa Lúcia","São Cristóvão e Névis","São Tomé e Príncipe",
  "São Vicente e Granadinas","Seicheles","Senegal","Serra Leoa","Sérvia","Singapura","Síria",
  "Somália","Sri Lanka","Suazilândia","Sudão","Sudão do Sul","Suécia","Suíça","Suriname",
  "Tailândia","Taiwan","Tajiquistão","Tanzânia","Timor-Leste","Togo","Tonga","Trinidad e Tobago",
  "Tunísia","Turcomenistão","Turquia","Tuvalu","Ucrânia","Uganda","Uruguai","Uzbequistão",
  "Vanuatu","Vaticano","Venezuela","Vietnã","Zâmbia","Zimbábue",
];

interface City { id: number; nome: string }

const citiesCache: Record<string, City[]> = {};

export function useAddressCep() {
  const [cepLoading, setCepLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchCep = useCallback(async (cep: string): Promise<{
    street?: string; city?: string; state?: string; country?: string;
  } | null> => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return null;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return null;
      return {
        street: [data.logradouro, data.bairro].filter(Boolean).join(", "),
        city: data.localidade || "",
        state: data.uf || "",
        country: "Brasil",
      };
    } catch {
      return null;
    } finally {
      setCepLoading(false);
    }
  }, []);

  const debouncedFetchCep = useCallback((cep: string, onResult: (r: any) => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await fetchCep(cep);
      if (result) onResult(result);
    }, 500);
  }, [fetchCep]);

  const fetchCities = useCallback(async (uf: string) => {
    if (!uf) { setCities([]); return; }
    if (citiesCache[uf]) { setCities(citiesCache[uf]); return; }
    setCitiesLoading(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data: City[] = await res.json();
      citiesCache[uf] = data;
      setCities(data);
    } catch {
      setCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return { cepLoading, fetchCep, debouncedFetchCep, cities, citiesLoading, fetchCities, BRAZILIAN_STATES };
}
