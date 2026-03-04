import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, UserPlus, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWorkflowResponsibles,
  useDeleteResponsible,
  WorkflowResponsible,
} from "@/hooks/useWorkflows";
import { ResponsibleModal } from "./ResponsibleModal";

export function ResponsiblesList() {
  const { data: responsibles, isLoading } = useWorkflowResponsibles();
  const deleteResponsible = useDeleteResponsible();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResponsible, setSelectedResponsible] = useState<WorkflowResponsible | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responsibleToDelete, setResponsibleToDelete] = useState<WorkflowResponsible | null>(null);

  const handleEdit = (responsible: WorkflowResponsible) => {
    setSelectedResponsible(responsible);
    setModalOpen(true);
  };

  const handleDelete = (responsible: WorkflowResponsible) => {
    setResponsibleToDelete(responsible);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (responsibleToDelete) {
      await deleteResponsible.mutateAsync(responsibleToDelete.id);
      setDeleteDialogOpen(false);
      setResponsibleToDelete(null);
    }
  };

  const handleAddNew = () => {
    setSelectedResponsible(null);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Responsáveis</CardTitle>
            <CardDescription>
              Pessoas que podem receber encaminhamentos de demandas
            </CardDescription>
          </div>
          <Button onClick={handleAddNew}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Responsável
          </Button>
        </CardHeader>
        <CardContent>
          {responsibles && responsibles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responsibles.map((responsible) => (
                  <TableRow key={responsible.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                          {responsible.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span>{responsible.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{responsible.position}</TableCell>
                    <TableCell>{responsible.department}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {responsible.email}
                        </span>
                        {responsible.phone && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {responsible.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={responsible.is_active ? "default" : "secondary"}
                        className={
                          responsible.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : ""
                        }
                      >
                        {responsible.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(responsible)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(responsible)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum responsável cadastrado</p>
              <p className="text-sm">Clique em "Novo Responsável" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ResponsibleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        responsible={selectedResponsible}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Responsável</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {responsibleToDelete?.name}? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
