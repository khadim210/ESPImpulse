import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Récupérer l'email de l'utilisateur depuis le corps de la requête
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email requis'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Créer un client Supabase avec les credentials service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Récupérer l'utilisateur depuis la table profiles
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Aucun utilisateur trouvé avec l'email ${email}`
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!user.auth_user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cet utilisateur n\'a pas de compte d\'authentification'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const NEW_PASSWORD = 'Welcome123!';

    // Réinitialiser le mot de passe
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      user.auth_user_id,
      {
        password: NEW_PASSWORD
      }
    );

    if (resetError) {
      throw resetError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        email: email,
        new_password: NEW_PASSWORD
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
