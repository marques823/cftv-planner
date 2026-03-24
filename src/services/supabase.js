import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qtahbprnggpaswdvbvgt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function saveProjectToCloud(projectData, userId, projectId = null) {
    if (!supabase || !userId) {
        console.warn('Supabase not configured or User not logged in. Saving to localStorage.');
        localStorage.setItem('cftv_project_latest', JSON.stringify(projectData));
        return { success: true, local: true };
    }

    console.log('Serviço Supabase: Upserting', { projectId, userId });

    const payload = { 
        name: projectData.name || 'Projeto sem título',
        data: projectData,
        user_id: userId,
        updated_at: new Date()
    };

    if (projectId) payload.id = projectId;

    const { data, error } = await supabase
        .from('projects')
        .upsert(payload, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('Erro no Supabase Upsert:', error);
        throw error;
    }
    
    console.log('Sucesso no Upsert. Dados retornados:', data);
    return { success: true, data };
}

export async function loadUserProjects(userId) {
    if (!supabase || !userId) return [];
    
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
    if (error) throw error;
    return data;
}
