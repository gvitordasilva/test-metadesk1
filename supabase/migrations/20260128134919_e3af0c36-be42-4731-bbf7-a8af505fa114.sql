-- Remover políticas antigas da tabela complaints
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can delete complaints" ON complaints;
DROP POLICY IF EXISTS "Attendants can view assigned complaints" ON complaints;
DROP POLICY IF EXISTS "Attendants can update assigned complaints" ON complaints;

-- Política: Admins veem todas as solicitações
CREATE POLICY "Admins can view all complaints"
ON complaints FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política: Atendentes veem solicitações atribuídas a eles OU não atribuídas (para pegar novas)
CREATE POLICY "Attendants can view complaints"
ON complaints FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'atendente') 
  AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

-- Política: Admins podem atualizar todas
CREATE POLICY "Admins can update all complaints"
ON complaints FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política: Atendentes podem atualizar as atribuídas a eles
CREATE POLICY "Attendants can update assigned complaints"
ON complaints FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'atendente') 
  AND assigned_to = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'atendente') 
  AND assigned_to = auth.uid()
);

-- Manter política de INSERT público (já existe, mas garantir)
DROP POLICY IF EXISTS "Anyone can create complaints" ON complaints;
CREATE POLICY "Anyone can create complaints"
ON complaints FOR INSERT
TO anon, authenticated
WITH CHECK (true);