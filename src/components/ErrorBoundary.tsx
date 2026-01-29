import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to Sentry in production
        if (import.meta.env.PROD) {
            Sentry.captureException(error, {
                extra: {
                    componentStack: errorInfo.componentStack,
                },
            });
        } else {
            console.error("Error caught by ErrorBoundary:", error, errorInfo);
        }
    }

    handleRefresh = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-destructive/10">
                                <AlertTriangle className="h-12 w-12 text-destructive" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-muted-foreground">
                                We apologize for the inconvenience. An unexpected error occurred.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="p-4 rounded-lg bg-muted text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-destructive">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={this.handleRefresh} variant="default">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Page
                            </Button>
                            <Link to="/">
                                <Button variant="outline" onClick={this.handleReset}>
                                    <Home className="h-4 w-4 mr-2" />
                                    Go to Home
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            If this problem persists, please{" "}
                            <Link to="/contact" className="text-primary hover:underline" onClick={this.handleReset}>
                                contact support
                            </Link>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
