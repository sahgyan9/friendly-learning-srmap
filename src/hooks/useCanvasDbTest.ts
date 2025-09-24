import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCanvasDbTest = () => {
    const [dbStatus, setDbStatus] = useState<{
        isConnected: boolean;
        tablesExist: boolean;
        rpcFunctionsWork: boolean;
        error: string | null;
        loading: boolean;
    }>({
        isConnected: false,
        tablesExist: false,
        rpcFunctionsWork: false,
        error: null,
        loading: true
    });

    const testDatabaseConnection = async () => {
        try {
            setDbStatus(prev => ({ ...prev, loading: true, error: null }));

            // Test 1: Basic connection
            const { data: testData, error: testError } = await supabase
                .from('users')
                .select('id')
                .limit(1);

            if (testError) {
                throw new Error(`Database connection failed: ${testError.message}`);
            }

            // Test 2: Check if canvas tables exist
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('canvas_sessions')
                .select('id')
                .limit(1);

            const { data: participantsData, error: participantsError } = await supabase
                .from('canvas_participants')
                .select('id')
                .limit(1);

            const { data: drawingsData, error: drawingsError } = await supabase
                .from('canvas_drawings')
                .select('id')
                .limit(1);

            const tablesExist = !sessionsError && !participantsError && !drawingsError;

            // Test 3: Check if RPC functions exist
            let rpcFunctionsWork = false;
            try {
                const { error: rpcError } = await supabase.rpc('generate_session_code');
                rpcFunctionsWork = !rpcError;
            } catch (err) {
                console.log('RPC function test failed:', err);
            }

            setDbStatus({
                isConnected: true,
                tablesExist,
                rpcFunctionsWork,
                error: null,
                loading: false
            });

        } catch (error) {
            console.error('Database test failed:', error);
            setDbStatus({
                isConnected: false,
                tablesExist: false,
                rpcFunctionsWork: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false
            });
        }
    };

    useEffect(() => {
        testDatabaseConnection();
    }, []);

    return {
        dbStatus,
        retestConnection: testDatabaseConnection
    };
};