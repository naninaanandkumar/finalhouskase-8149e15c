-- 1. chat_conversations: prevent self-assignment as conversation admin
DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
CREATE POLICY "Users can create conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id AND admin_id IS NULL);

-- 2. family_testimonials: explicit public gate to active rows only
DROP POLICY IF EXISTS "Public can view active family testimonials" ON public.family_testimonials;
CREATE POLICY "Public can view active family testimonials"
ON public.family_testimonials
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 3. product attribute metadata: scope to storefront roles, assignments limited to active products
DROP POLICY IF EXISTS "Anyone can view attributes" ON public.product_attributes;
CREATE POLICY "Anyone can view attributes"
ON public.product_attributes
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view attribute values" ON public.product_attribute_values;
CREATE POLICY "Anyone can view attribute values"
ON public.product_attribute_values
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view attribute assignments" ON public.product_attribute_assignments;
CREATE POLICY "Anyone can view attribute assignments"
ON public.product_attribute_assignments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_attribute_assignments.product_id
      AND p.is_active = true
  )
);