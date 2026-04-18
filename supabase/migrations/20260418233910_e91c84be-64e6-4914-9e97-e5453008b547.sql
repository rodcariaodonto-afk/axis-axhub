DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_tenant_id uuid := '7df9b3e1-4a54-4b72-bf42-4c2de3ef36ad';
  v_email text := 'teste@meta.com';
  v_password text := 'MetaTeste2026!';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Meta Reviewer"}'::jsonb, false, ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;

  UPDATE public.profiles
    SET tenant_id = v_tenant_id, full_name = 'Meta Reviewer', email = v_email, status = 'active'
    WHERE id = v_user_id;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'readonly');

  DELETE FROM public.user_permissions WHERE user_id = v_user_id;
  INSERT INTO public.user_permissions (
    tenant_id, user_id, module_name, can_view, can_create, can_edit, can_delete, can_export, can_manage_users
  ) VALUES
    (v_tenant_id, v_user_id, 'whatsapp', true, true, true, true, true, false),
    (v_tenant_id, v_user_id, 'campanhas', true, true, true, false, false, false);
END $$;