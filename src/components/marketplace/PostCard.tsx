import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";

export interface PostCardProps {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    author: string;
    image?: string;
    onView?: () => void;
}

export function PostCard({
    title,
    description,
    category,
    date,
    author,
    image,
    onView
}: PostCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            {image && (
                <div className="aspect-video w-full overflow-hidden">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <CardHeader>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <Badge variant="secondary">{category}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground line-clamp-2">{description}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{date}</span>
                    </div>
                </div>
                <Button variant="default" size="sm" onClick={onView}>
                    Register Now
                </Button>
            </CardFooter>
        </Card>
    );
}

export { MarketPlace };
export default MarketPlace; 