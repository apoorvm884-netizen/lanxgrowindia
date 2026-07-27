-- Enforce the final School -> Class -> Videos access model.
-- Categories are retained as the physical table name for compatibility,
-- but represent Classes in the product.

drop policy if exists "Students can read own school published content"
  on public.content;

create policy "Students can read own class published content"
  on public.content for select
  to authenticated
  using (
    public.is_student()
    and school_id = public.get_user_school_id()
    and status = 'published'
    and sync_state = 'active'
    and exists (
      select 1
      from public.students student
      where student.user_id = auth.uid()
        and student.school_id = content.school_id
        and student.class_id = content.category_id
    )
  );

create index if not exists idx_content_school_class_status
  on public.content (school_id, category_id, status, sync_state);
