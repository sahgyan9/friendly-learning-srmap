import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Users, Play, Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useCanvasDbTest } from '@/hooks/useCanvasDbTest';
import {
    createCanvasSession,
    joinCanvasSession,
    getMentorCanvasSessions
} from '@/integrations/supabase/services/canvas';
import { CreateSessionData, JoinSessionData, CanvasSession } from '@/types/canvas';

const CanvasTest: React.FC = () => {
    const { user, profile, isMentor } = useAuth();
    const { dbStatus, retestConnection } = useCanvasDbTest();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Create session state
    const [sessionTitle, setSessionTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Join session state
    const [sessionCode, setSessionCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Sessions list
    const [sessions, setSessions] = useState<CanvasSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const handleCreateSession = async () => {
        if (!user?.id || !sessionTitle.trim()) {
            setError('Please enter a session title');
            return;
        }

        setIsCreating(true);
        clearMessages();

        try {
            const sessionData: CreateSessionData = {
                title: sessionTitle.trim(),
                maxParticipants: 10,
                backgroundColor: '#ffffff'
            };

            const { data, error: createError } = await createCanvasSession(user.id, sessionData);

            if (createError || !data) {
                throw createError || new Error('Failed to create session');
            }

            setSuccess(`Session created successfully! Session code: ${data.session_code}`);
            setSessionTitle('');

            // Refresh sessions list if mentor
            if (isMentor) {
                loadMentorSessions();
            }

        } catch (err) {
            console.error('Error creating session:', err);
            setError(err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSession = async () => {
        if (!user?.id || !sessionCode.trim()) {
            setError('Please enter a session code');
            return;
        }

        setIsJoining(true);
        clearMessages();

        try {
            const joinData: JoinSessionData = {
                sessionCode: sessionCode.trim().toUpperCase()
            };

            const { data, error: joinError } = await joinCanvasSession(user.id, joinData);

            if (joinError || !data) {
                throw joinError || new Error('Failed to join session');
            }

            setSuccess(`Successfully joined session: "${data.title}"`);
            setSessionCode('');

        } catch (err) {
            console.error('Error joining session:', err);
            setError(err instanceof Error ? err.message : 'Failed to join session');
        } finally {
            setIsJoining(false);
        }
    };

    const loadMentorSessions = async () => {
        if (!user?.id || !isMentor) return;

        setIsLoadingSessions(true);
        try {
            const { data, error: sessionsError } = await getMentorCanvasSessions(user.id);

            if (sessionsError) {
                throw sessionsError;
            }

            setSessions(data || []);
        } catch (err) {
            console.error('Error loading sessions:', err);
            setError('Failed to load sessions');
        } finally {
            setIsLoadingSessions(false);
        }
    };

    React.useEffect(() => {
        if (isMentor) {
            loadMentorSessions();
        }
    }, [isMentor, user?.id]);

    if (!user) {
        return (
            <Card className="max-w-md mx-auto mt-8">
                <CardContent className="pt-6">
                    <Alert>
                        <AlertDescription>
                            Please log in to test canvas functionality.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Canvas Test Page</h1>
                <p className="text-gray-600">
                    Testing canvas session creation and joining functionality
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                        <strong>User:</strong> {profile?.name || user.email}
                        <span className="ml-4">
                            <strong>Role:</strong> {isMentor ? 'Mentor' : 'Student'}
                        </span>
                    </p>
                </div>
            </div>

            {/* Database Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Database Status
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={retestConnection}
                            disabled={dbStatus.loading}
                        >
                            {dbStatus.loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {dbStatus.loading ? (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing database connection...
                        </div>
                    ) : dbStatus.error ? (
                        <Alert variant="destructive">
                            <XCircle className="w-4 h-4" />
                            <AlertDescription>{dbStatus.error}</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {dbStatus.isConnected ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-sm">
                                    Database Connection: {dbStatus.isConnected ? 'Connected' : 'Failed'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {dbStatus.tablesExist ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-sm">
                                    Canvas Tables: {dbStatus.tablesExist ? 'Exist' : 'Missing'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {dbStatus.rpcFunctionsWork ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-sm">
                                    RPC Functions: {dbStatus.rpcFunctionsWork ? 'Working' : 'Not Working'}
                                </span>
                            </div>

                            {!dbStatus.tablesExist && (
                                <Alert className="mt-4">
                                    <AlertDescription>
                                        Canvas tables are missing. Please run the SQL commands in your Supabase dashboard.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Create Session Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Create Session
                            {!isMentor && <span className="text-sm text-gray-500">(Mentor Only)</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Input
                                placeholder="Enter session title..."
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                                disabled={!isMentor || isCreating}
                            />
                        </div>
                        <Button
                            onClick={handleCreateSession}
                            disabled={!isMentor || isCreating || !sessionTitle.trim()}
                            className="w-full"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Session
                                </>
                            )}
                        </Button>
                        {!isMentor && (
                            <p className="text-sm text-gray-500">
                                Only mentors can create canvas sessions.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Join Session Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Join Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Input
                                placeholder="Enter session code..."
                                value={sessionCode}
                                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                                disabled={isJoining}
                                maxLength={6}
                            />
                        </div>
                        <Button
                            onClick={handleJoinSession}
                            disabled={isJoining || !sessionCode.trim()}
                            className="w-full"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Join Session
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Mentor's Sessions List */}
            {isMentor && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Your Sessions
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadMentorSessions}
                                disabled={isLoadingSessions}
                            >
                                {isLoadingSessions ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSessions ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No sessions created yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <h4 className="font-medium">{session.title}</h4>
                                            <p className="text-sm text-gray-500">
                                                Code: <span className="font-mono font-bold">{session.session_code}</span>
                                                {' • '}
                                                Status: {session.is_active ? 'Active' : 'Inactive'}
                                                {' • '}
                                                Created: {new Date(session.created_at!).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-400'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Database Test Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Test Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>For Mentors:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Create a session with any title</li>
                        <li>Note the generated session code</li>
                        <li>Check that the session appears in "Your Sessions" list</li>
                    </ul>

                    <p className="pt-4"><strong>For Students:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Get a session code from a mentor</li>
                        <li>Enter the code to join the session</li>
                        <li>Verify successful join message</li>
                    </ul>

                    <p className="pt-4"><strong>Testing Database:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Check Supabase dashboard for new records in canvas_sessions</li>
                        <li>Verify canvas_participants table gets populated when joining</li>
                        <li>Test RLS policies by trying to access with different users</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default CanvasTest;