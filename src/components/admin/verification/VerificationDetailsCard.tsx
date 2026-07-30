import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    Loader2,
    Eye,
    Phone,
    Mail,
    GraduationCap,
    BookOpen,
    Calendar,
    Award,
    Heart,
    ExternalLink,
    MapPin
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { updateVerificationStatus } from "@/integrations/supabase/services/mentor-verification";
import { useAuth } from "@/context/AuthContext";
import VerificationFlags from "./VerificationFlags";
import { enrollmentYear } from "@/lib/college-id";

interface VerificationDetailsCardProps {
    verification: any;
    onStatusUpdate: () => void;
}

const VerificationDetailsCard = ({ verification, onStatusUpdate }: VerificationDetailsCardProps) => {
    const [updating, setUpdating] = useState<string | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { user } = useAuth();

    const applicationData = verification.application_data || {};

    const handleStatusUpdate = async (status: 'approved' | 'rejected', reason?: string) => {
        if (!user) {
            toast.error("User not authenticated");
            return;
        }

        if (status === 'rejected' && !reason?.trim()) {
            toast.error("Please provide a reason for rejection to help the user improve their application");
            return;
        }

        try {
            setUpdating(verification.id);

            await updateVerificationStatus(verification.id, status, user.id, reason);

            if (status === 'approved') {
                toast.success("Mentor application approved successfully");
            } else {
                toast.success("Application rejected with feedback. User can now edit and resubmit their application.");
            }
            
            onStatusUpdate();

            if (status === 'rejected') {
                setRejectDialogOpen(false);
                setRejectionReason("");
            }
        } catch (error: any) {
            console.error('Error updating verification status:', error);
            toast.error(`Failed to ${status} mentor application: ${error.message || 'Unknown error'}`);
        } finally {
            setUpdating(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'rejected':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
        }
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={applicationData.profile_image || verification.user?.profile_image} />
                            <AvatarFallback className="text-lg">
                                {(applicationData.name || verification.user?.name)?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <CardTitle className="text-xl">
                                {applicationData.name || verification.user?.name || 'Unknown User'}
                            </CardTitle>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{verification.user?.email}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{applicationData.department || verification.user?.department}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(verification.status)}>
                            {getStatusIcon(verification.status)}
                            <span className="ml-1 capitalize">{verification.status}</span>
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <VerificationFlags flags={verification.flags} />

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                        <div>
                            <p className="font-medium">CGPA</p>
                            <p className="text-muted-foreground">{verification.cgpa || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <div>
                            <p className="font-medium">Year</p>
                            <p className="text-muted-foreground">{verification.year_of_studies || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <BookOpen className="h-4 w-4 text-purple-500" />
                        <div>
                            <p className="font-medium">University</p>
                            <p className="text-muted-foreground">{verification.university || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-orange-500" />
                        <div>
                            <p className="font-medium">Mobile</p>
                            <p className="text-muted-foreground">{applicationData.mobile || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Identity. The enrollment year is shown alongside the ID so the
                    graduation year can be sanity-checked at a glance. */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-rose-500" />
                        <div>
                            <p className="font-medium">College ID</p>
                            <p className="font-mono text-muted-foreground">
                                {verification.college_id || 'Not provided'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <Award className="h-4 w-4 text-indigo-500" />
                        <div>
                            <p className="font-medium">Graduates</p>
                            <p className="text-muted-foreground">
                                {verification.graduation_year || 'Not provided'}
                                {enrollmentYear(verification.college_id || '') !== null && (
                                    <span className="ml-1 opacity-70">
                                        (enrolled {enrollmentYear(verification.college_id)})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Bio Preview */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <h4 className="font-semibold">Bio</h4>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-sm leading-relaxed">
                            {applicationData.bio ?
                                applicationData.bio.length > 150
                                    ? `${applicationData.bio.substring(0, 150)}...`
                                    : applicationData.bio
                                : 'No bio provided'
                            }
                        </p>
                    </div>
                </div>

                {/* Skills Preview */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <h4 className="font-semibold">Skills</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {applicationData.skills ?
                            applicationData.skills.split(',').slice(0, 3).map((skill: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {skill.trim()}
                                </Badge>
                            ))
                            : <span className="text-sm text-muted-foreground">No skills provided</span>
                        }
                        {applicationData.skills && applicationData.skills.split(',').length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{applicationData.skills.split(',').length - 3} more
                            </Badge>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Submission Info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                            Submitted {formatDistanceToNow(new Date(verification.submitted_at))} ago
                        </span>
                    </div>

                    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Complete Application Details</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                                {/* Personal Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                                            <p className="mt-1">{applicationData.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                            <p className="mt-1">{verification.user?.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Mobile</Label>
                                            <p className="mt-1">{applicationData.mobile || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                                            <p className="mt-1">{applicationData.department || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Academic Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">University</Label>
                                            <p className="mt-1">{verification.university || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Year of Studies</Label>
                                            <p className="mt-1">{verification.year_of_studies || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">CGPA</Label>
                                            <p className="mt-1">{verification.cgpa || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Professional Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Skills</Label>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {applicationData.skills ?
                                                    applicationData.skills.split(',').map((skill: string, index: number) => (
                                                        <Badge key={index} variant="secondary">
                                                            {skill.trim()}
                                                        </Badge>
                                                    ))
                                                    : <span className="text-sm text-muted-foreground">No skills provided</span>
                                                }
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">LinkedIn Profile</Label>
                                            {applicationData.linkedin_url ? (
                                                <div className="mt-1">
                                                    <a
                                                        href={applicationData.linkedin_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                                    >
                                                        <span>{applicationData.linkedin_url}</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <p className="mt-1 text-muted-foreground">Not provided</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                                            <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {applicationData.bio || 'No bio provided'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                                    <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Hobbies & Interests</Label>
                                        <p className="mt-1">{verification.hobbies || 'Not specified'}</p>
                                    </div>
                                </div>

                                {/* Review Information */}
                                {(verification.reviewed_at || verification.rejection_reason) && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold border-b pb-2">Review Information</h3>
                                        {verification.reviewed_at && verification.reviewed_by_user && (
                                            <div>
                                                <Label className="text-sm font-medium text-muted-foreground">Reviewed By</Label>
                                                <p className="mt-1">
                                                    {verification.reviewed_by_user.name} on{' '}
                                                    {new Date(verification.reviewed_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {verification.rejection_reason && (
                                            <div>
                                                <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                                                <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                                    <p className="text-sm text-red-700 dark:text-red-300">
                                                        {verification.rejection_reason}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Action Buttons */}
                {verification.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            onClick={() => handleStatusUpdate('approved')}
                            disabled={updating === verification.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {updating === verification.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve Application
                        </Button>

                        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={updating === verification.id}
                                >
                                    {updating === verification.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Reject Application
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Reject Mentor Application</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                            <strong>Note:</strong> When you reject this application with feedback, the user will be able to edit their existing application and resubmit it. Their current data will be preserved, so they won't have to start from scratch.
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="rejection-reason">
                                            Reason for rejection <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="rejection-reason"
                                            placeholder="Please be specific about what needs to be improved (e.g., 'Please provide more details in your bio section and add your LinkedIn profile URL')"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            className="mt-2"
                                            rows={4}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Provide constructive feedback to help the user improve their application.
                                        </p>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setRejectDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleStatusUpdate('rejected', rejectionReason)}
                                            disabled={!rejectionReason.trim()}
                                        >
                                            Reject with Feedback
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* Rejection Reason Display */}
                {verification.status === 'rejected' && verification.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-t">
                        <div className="flex items-center space-x-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <h4 className="font-semibold text-red-700 dark:text-red-300">Rejection Reason</h4>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                            {verification.rejection_reason}
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                💡 <strong>User can edit and resubmit:</strong> The user can access their rejected application at{' '}
                                <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/become-mentor?edit=true</code> to make improvements and resubmit.
                            </p>
                        </div>
                    </div>
                )}

                {/* Review Info for processed applications */}
                {verification.reviewed_at && verification.reviewed_by_user && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center space-x-2">
                            <User className="h-3 w-3" />
                            <span>
                                Reviewed by {verification.reviewed_by_user.name} on{' '}
                                {new Date(verification.reviewed_at).toLocaleDateString()} at{' '}
                                {new Date(verification.reviewed_at).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default VerificationDetailsCard;
