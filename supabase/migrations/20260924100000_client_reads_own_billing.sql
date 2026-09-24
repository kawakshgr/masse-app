-- A client follows her own payments.
--
-- Until now money was the coach's alone (see invoice_pdf_archive). The client
-- now reads — never writes — three things about herself: the arrangement she
-- agreed to, the months her coach has recorded, and the PDF of each invoice
-- actually issued to her. Drafts stay the coach's working copy and are not
-- shown: a figure that may still change is not one to put in front of her.

create policy invoices_select_own_client on public.invoices
  for select to authenticated
  using (client_id = (select auth.uid()) and status <> 'draft');

create policy billing_arrangements_select_own_client on public.billing_arrangements
  for select to authenticated
  using (client_id = (select auth.uid()));

-- The file follows the row: readable only when it is the pdf_path of one of
-- her own issued invoices. A path guessed or built by hand matches nothing.
create policy invoices_read_own_client on storage.objects
  for select to authenticated
  using (
    bucket_id = 'invoices'
    and exists (
      select 1 from public.invoices i
      where i.pdf_path = storage.objects.name
        and i.client_id = (select auth.uid())
        and i.status <> 'draft'
    )
  );
