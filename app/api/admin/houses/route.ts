import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  // Verifica se é admin ou super admin
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  try {
    const { data, error } = await supabaseAdmin
      .from("houses_of_sports")
      .select(`
        id,
        name,
        country_code,
        sport_id,
        status,
        created_at,
        updated_at,
        sports (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error in GET /api/admin/houses:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Supabase error loading houses",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      houses: data || [],
    });
  } catch (err) {
    console.error("Unexpected error in /api/admin/houses:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
