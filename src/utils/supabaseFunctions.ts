import { supabase } from './supabaseClient';

export async function getUserData(userId: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error) {
        console.error("Error fetching user data:", error);
        return null;
    }

    return data;
}

export async function getGameData(gameId: string) {
    const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (error) {
        console.error("Error fetching game data:", error);
        return null;
    }

    return data;
}

export async function storeGameResult(userId: string, gameId: string, result: string, betAmount: number, winAmount: number) {
    const { data, error } = await supabase.from('game_results').insert([
        { user_id: userId, game_id: gameId, result, bet_amount: betAmount, win_amount: winAmount }
    ]);

    if (error) {
        console.error("Error storing game result:", error);
        return null;
    }

    return data;
}
