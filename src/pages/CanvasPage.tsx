import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CollaborativeCanvas } from '@/components/canvas/CollaborativeCanvas';
import { CreateSessionModal } from '@/components/canvas/CreateSessionModal';
import { JoinSessionModal } from '@/components/canvas/JoinSessionModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMentorCanvasSessions, checkCanvasTablesExist } from '@/integrations/supabase/services/canvas';
import { CanvasSession } from '@/types/canvas';
import { Palette, Plus, LogIn, Loader2, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const CanvasPage: React.FC = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');

    const [mySessions, setMySessions] = useState<CanvasSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [databaseExists, setDatabaseExists] = useState<boolean | null>(null);

    // If there's a session ID in URL, show the canvas
    if (sessionId) {
        return (
            <CollaborativeCanvas
                sessionId={sessionId}
                onLeave={() => navigate('/canvas')}
            />
        );
    }

    // Load mentor's sessions
    const isMentor = profile?.role === 'mentor';

    useEffect(() => {
        checkDatabaseSetup();
    }, []);

    useEffect(() => {
        if (user?.id && isMentor) {
            loadMySessions();
        }
    }, [user?.id, isMentor]);

    const checkDatabaseSetup = async () => {
        const { exists } = await checkCanvasTablesExist();
        setDatabaseExists(exists);
        if (!exists) {
            console.error('Canvas database tables do not exist. Please run COMPLETE_DATABASE_SETUP.sql');
        }
    };

    const loadMySessions = async () => {
        if (!user?.id) return;

        setIsLoadingSessions(true);
        try {
            const { data, error } = await getMentorCanvasSessions(user.id);
            if (error) {
                console.error('Error loading sessions:', error);
                // Don't show error toast for empty results, only for actual errors
                if (error.message && !error.message.includes('0 rows')) {
                    toast.error('Failed to load your sessions. Please ensure database is set up correctly.');
                }
            } else if (data) {
                setMySessions(data);
            }
        } catch (error: any) {
            console.error('Error loading sessions:', error);
            // Only show error if it's not just empty results
            if (error?.message && !error.message.includes('0 rows')) {
                toast.error('Database not configured. Please run the SQL migration first.');
            }
        } finally {
            setIsLoadingSessions(false);
        }
    }; const handleSessionCreated = (sessionId: string, sessionCode: string) => {
        toast.success(`Session created! Code: ${sessionCode}`, {
            duration: 5000,
        });
        navigate(`/canvas?session=${sessionId}`);
    };

    const handleSessionJoined = (sessionId: string) => {
        navigate(`/canvas?session=${sessionId}`);
    };

    const joinExistingSession = (sessionId: string) => {
        navigate(`/canvas?session=${sessionId}`);
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="max-w-md mx-auto p-8 text-center">
                    <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-semibold mb-2">Collaborative Canvas</h2>
                    <p className="text-muted-foreground mb-6">
                        Please log in to access the collaborative canvas feature
                    </p>
                    <Button onClick={() => navigate('/login')}>
                        Log In
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Database Setup Warning */}
            {databaseExists === false && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Database Setup Required</AlertTitle>
                    <AlertDescription>
                        The canvas feature requires database setup. Please run the SQL migration file
                        <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">COMPLETE_DATABASE_SETUP.sql</code>
                        in your Supabase SQL Editor. Check browser console (F12) for details.
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Palette className="h-8 w-8" />
                            Collaborative Canvas
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Real-time collaborative whiteboard for teaching and learning
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {isMentor && (
                            <CreateSessionModal
                                onSessionCreated={handleSessionCreated}
                                trigger={
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Start New Session
                                    </Button>
                                }
                            />
                        )}

                        <JoinSessionModal
                            onSessionJoined={handleSessionJoined}
                            trigger={
                                <Button variant="outline" className="gap-2">
                                    <LogIn className="h-4 w-4" />
                                    Join Session
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="active" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="active">Active Sessions</TabsTrigger>
                    {isMentor && (
                        <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
                    )}
                    <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>

                {/* Active Sessions Tab */}
                <TabsContent value="active">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                        {isLoadingSessions ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : mySessions.filter(s => s.is_active).length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {mySessions
                                    .filter(session => session.is_active)
                                    .map(session => (
                                        <Card key={session.id} className="p-4 hover:shadow-lg transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold mb-1">{session.title}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        <span>
                                                            {formatDistanceToNow(new Date(session.created_at || ''), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge variant="default">Active</Badge>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>Max {session.max_participants} participants</span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="font-medium">Code:</span>{' '}
                                                    <code className="px-2 py-1 bg-muted rounded text-xs">
                                                        {session.session_code}
                                                    </code>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => joinExistingSession(session.id)}
                                                className="w-full"
                                                size="sm"
                                            >
                                                Join Session
                                            </Button>
                                        </Card>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground mb-4">
                                    No active sessions at the moment
                                </p>
                                {isMentor && (
                                    <CreateSessionModal
                                        onSessionCreated={handleSessionCreated}
                                        trigger={
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Start Your First Session
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* My Sessions Tab (Mentors Only) */}
                {isMentor && (
                    <TabsContent value="my-sessions">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">My Canvas Sessions</h3>
                                <Button onClick={loadMySessions} variant="outline" size="sm">
                                    Refresh
                                </Button>
                            </div>

                            {isLoadingSessions ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : mySessions.length > 0 ? (
                                <div className="space-y-3">
                                    {mySessions.map(session => (
                                        <Card key={session.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-semibold">{session.title}</h4>
                                                        <Badge variant={session.is_active ? 'default' : 'secondary'}>
                                                            {session.is_active ? 'Active' : 'Ended'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {formatDistanceToNow(new Date(session.created_at || ''), {
                                                                    addSuffix: true,
                                                                })}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            Code: <code className="text-xs">{session.session_code}</code>
                                                        </div>
                                                    </div>
                                                </div>

                                                {session.is_active && (
                                                    <Button
                                                        onClick={() => joinExistingSession(session.id)}
                                                        size="sm"
                                                    >
                                                        Resume
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground mb-4">
                                        You haven't created any sessions yet
                                    </p>
                                    <CreateSessionModal
                                        onSessionCreated={handleSessionCreated}
                                        trigger={
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Your First Session
                                            </Button>
                                        }
                                    />
                                </div>
                            )}
                        </Card>
                    </TabsContent>
                )}

                {/* About Tab */}
                <TabsContent value="about">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">About Collaborative Canvas</h3>
                        <div className="space-y-4 text-muted-foreground">
                            <p>
                                The Collaborative Canvas is a real-time whiteboard tool designed for
                                mentors and students to teach and learn together visually.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">Features</h4>
                                    <ul className="space-y-2">
                                        <li>✓ Real-time synchronized drawing</li>
                                        <li>✓ Multiple drawing tools (pen, eraser, text)</li>
                                        <li>✓ See other participants' cursors live</li>
                                        <li>✓ Participant list with active status</li>
                                        <li>✓ Easy session codes for joining</li>
                                        <li>✓ Unlimited canvas size</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">How to Use</h4>
                                    <ul className="space-y-2">
                                        <li><strong>Mentors:</strong> Click "Start New Session" to create a session</li>
                                        <li><strong>Students:</strong> Click "Join Session" and enter the code</li>
                                        <li><strong>Drawing:</strong> Both mentors and students can draw on the canvas</li>
                                        <li><strong>Clearing:</strong> Only mentors can clear the canvas</li>
                                        <li><strong>Ending:</strong> Sessions end when the mentor leaves or clicks "End Session"</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
