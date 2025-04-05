import { Ad } from "@/types/mentor";
import { Button } from "@/components/ui/button";

interface AdCardProps {
    ad: Ad;
}

const AdCard = ({ ad }: AdCardProps) => {
    const {
        title,
        description,
        image_url,
        price,
        features,
        cta_text,
        cta_url,
        badge_text,
        badge_color
    } = ad;

    return (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            {/* Image */}
            <div className="relative mb-4">
                <img
                    src={image_url}
                    alt={title}
                    className="w-full h-48 object-cover rounded-lg"
                />
                {badge_text && (
                    <span
                        className="absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: badge_color, color: "white" }}
                    >
                        {badge_text}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-card-foreground">{title}</h3>
                <p className="text-muted-foreground">{description}</p>

                {price && (
                    <div className="text-2xl font-bold text-primary">{price}</div>
                )}

                {features && features.length > 0 && (
                    <ul className="space-y-2">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-center text-muted-foreground">
                                <span className="mr-2">✓</span>
                                {feature}
                            </li>
                        ))}
                    </ul>
                )}

                <Button
                    asChild
                    className="w-full"
                    style={{ backgroundColor: badge_color }}
                >
                    <a href={cta_url} target="_blank" rel="noopener noreferrer">
                        {cta_text}
                    </a>
                </Button>
            </div>
        </div>
    );
};

export default AdCard; 