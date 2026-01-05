
interface InstagramData {
    bio: string;
    followers: string;
    following: string;
    posts: string;
    postTypes: string;
    visualStyle: string;
    recentPostsDescription: string;
    highlights: string;
    linkInBio: string;
    profileUrl: string;
}

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

export const getInstagramData = async (username: string): Promise<InstagramData | { error: string }> => {
    const cleanUser = username.replace('@', '').trim();
    
    if (!cleanUser) {
        return { error: 'Username vazio.' };
    }

    try {
        const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUser}`, {
            method: 'GET',
            headers: {
                'X-IG-App-ID': '936619743392459',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Site': 'same-origin'
            }
        });

        if (!response.ok) {
            if (response.status === 404) throw new Error('Perfil não encontrado.');
            if (response.status === 401) throw new Error('Perfil privado ou requer login.');
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const json = await response.json();
        const user = json?.data?.user;

        if (!user) {
            throw new Error('Estrutura de dados inválida retornada pelo Instagram.');
        }

        // Processamento dos posts recentes
        const timelineEdges = user.edge_owner_to_timeline_media?.edges || [];
        const recentPosts = timelineEdges.slice(0, 9);
        
        // Calcular média de likes e identificar tipos
        let totalLikes = 0;
        const typesSet = new Set<string>();

        recentPosts.forEach((edge: any) => {
            const node = edge.node;
            totalLikes += node.edge_liked_by?.count || 0;
            
            if (node.is_video) {
                typesSet.add('Vídeo');
            } else if (node.edge_sidecar_to_children) {
                typesSet.add('Carrossel');
            } else {
                typesSet.add('Foto');
            }
        });

        const avgLikes = recentPosts.length > 0 
            ? Math.round(totalLikes / recentPosts.length) 
            : 0;

        const postTypes = Array.from(typesSet).join(', ') || 'Sem posts recentes';
        
        // Construção da descrição visual contextual
        const visualStyle = `Perfil ${user.is_verified ? 'verificado' : 'não verificado'}. ` +
            `${user.category_name ? `Categoria: ${user.category_name}. ` : ''}` +
            `Conteúdo predominante: ${postTypes}. ` +
            `Engajamento médio estimado: ${avgLikes} likes/post.`;

        const recentPostsDescription = recentPosts.length > 0 
            ? `Análise baseada nos últimos ${recentPosts.length} posts. Média de ${avgLikes} curtidas.` 
            : 'Sem publicações recentes para análise.';

        return {
            bio: user.biography || '',
            followers: formatNumber(user.edge_followed_by?.count || 0),
            following: formatNumber(user.edge_follow?.count || 0),
            posts: formatNumber(user.edge_owner_to_timeline_media?.count || 0),
            postTypes,
            visualStyle,
            recentPostsDescription,
            highlights: user.highlight_reel_count ? `${user.highlight_reel_count} destaques` : '0',
            linkInBio: user.external_url || '',
            profileUrl: `https://instagram.com/${cleanUser}`
        };

    } catch (e) {
        console.error('Erro ao buscar dados do Instagram:', e);
        return { error: e instanceof Error ? e.message : 'Erro desconhecido ao acessar Instagram.' };
    }
};
