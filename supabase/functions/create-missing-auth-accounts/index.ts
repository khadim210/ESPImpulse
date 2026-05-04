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

    // Récupérer tous les utilisateurs sans auth_user_id
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .is('auth_user_id', null);

    if (usersError) {
      throw usersError;
    }

    const results = [];
    const DEFAULT_PASSWORD = 'Welcome123!';

    // Pour chaque utilisateur, créer un compte d'authentification
    for (const user of users || []) {
      try {
        // Créer le compte d'authentification
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
            organization: user.organization
          }
        });

        if (authError) {
          results.push({
            user: user.email,
            status: 'error',
            message: authError.message
          });
          continue;
        }

        // Mettre à jour le profil avec l'auth_user_id
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ auth_user_id: authData.user.id })
          .eq('id', user.id);

        if (updateError) {
          // Rollback: supprimer le compte auth créé
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

          results.push({
            user: user.email,
            status: 'error',
            message: `Erreur lors de la mise à jour du profil: ${updateError.message}`
          });
          continue;
        }

        results.push({
          user: user.email,
          status: 'success',
          auth_user_id: authData.user.id
        });

      } catch (error: any) {
        results.push({
          user: user.email,
          status: 'error',
          message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_processed: users?.length || 0,
        default_password: DEFAULT_PASSWORD,
        results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
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
      },
    );
  }
});
