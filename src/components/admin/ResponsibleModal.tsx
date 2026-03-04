import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCreateResponsible,
  useUpdateResponsible,
  WorkflowResponsible,
} from "@/hooks/useWorkflows";

interface ResponsibleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsible?: WorkflowResponsible | null;
}

export function ResponsibleModal({
  open,
  onOpenChange,
  responsible,
}: ResponsibleModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    department: "",
    email: "",
    phone: "",
    is_active: true,
  });

  const createResponsible = useCreateResponsible();
  const updateResponsible = useUpdateResponsible();

  const isEditing = !!responsible;
  const isLoading = createResponsible.isPending || updateResponsible.isPending;

  useEffect(() => {
    if (responsible) {
      setFormData({
        name: responsible.name,
        position: responsible.position,
        department: responsible.department,
        email: responsible.email,
        phone: responsible.phone || "",
        is_active: responsible.is_active,
      });
    } else {
      setFormData({
        name: "",
        position: "",
        department: "",
        email: "",
        phone: "",
        is_active: true,
      });
    }
  }, [responsible, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      phone: formData.phone || undefined,
    };

    if (isEditing && responsible) {
      await updateResponsible.mutateAsync({ id: responsible.id, ...payload });
    } else {
      await createResponsible.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Responsável" : "Novo Responsável"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize os dados do responsável"
                : "Cadastre um novo responsável para receber encaminhamentos"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Maria Silva"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="position">Cargo *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  placeholder="Ex: Coordenador"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Setor *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="Ex: Financeiro"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Ex: maria.silva@empresa.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Ex: (11) 99999-9999"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Disponível para receber demandas
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
