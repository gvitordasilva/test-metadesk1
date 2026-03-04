import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { ComplaintFilters } from "@/hooks/useComplaints";

interface ComplaintFiltersProps {
  filters: ComplaintFilters;
  onFiltersChange: (filters: ComplaintFilters) => void;
}

export function ComplaintFiltersComponent({
  filters,
  onFiltersChange,
}: ComplaintFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === "all" ? undefined : value,
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === "all" ? undefined : value,
    });
  };

  const handleChannelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      channel: value === "all" ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.type || filters.category || filters.channel;

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex-grow relative min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por protocolo, descrição ou nome..."
          className="pl-8"
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="novo">Novo</SelectItem>
          <SelectItem value="visualizado">Visualizado</SelectItem>
          <SelectItem value="em_analise">Em Análise</SelectItem>
          <SelectItem value="resolvido">Resolvido</SelectItem>
          <SelectItem value="fechado">Fechado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="reclamacao">Reclamação</SelectItem>
          <SelectItem value="denuncia">Denúncia</SelectItem>
          <SelectItem value="sugestao">Sugestão</SelectItem>
          <SelectItem value="elogio">Elogio</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.channel || "all"} onValueChange={handleChannelChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os canais</SelectItem>
          <SelectItem value="web">Formulário Web</SelectItem>
          <SelectItem value="voice">Agente de Voz</SelectItem>
          <SelectItem value="phone">Telefone</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
