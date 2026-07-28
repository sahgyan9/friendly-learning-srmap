import { useEffect } from "react";

interface StructuredDataProps {
    data: Record<string, any>;
}

/**
 * Component to inject structured data JSON-LD into the page head
 * 
 * @param data - The structured data object that will be converted to JSON-LD
 * @returns null - This is a utility component that doesn't render anything visible
 * 
 * Example usage:
 * <StructuredData 
 *   data={{
 *     "@context": "https://schema.org",
 *     "@type": "Organization",
 *     "name": "Project FL",
 *     "url": PRIMARY_DOMAIN,
 *     // other properties...
 *   }} 
 * />
 */
const StructuredData = ({ data }: StructuredDataProps) => {
    useEffect(() => {
        // Create the script element for JSON-LD
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(data);
        script.setAttribute("data-testid", `structured-data-${data["@type"]}`);

        // Add it to the document head
        document.head.appendChild(script);

        // Clean up when component unmounts
        return () => {
            try {
                if (script.parentNode) {
                    document.head.removeChild(script);
                }
            } catch (error) {
                console.error("Error removing structured data script:", error);
            }
        };
    }, [data]);

    // This component doesn't render anything visible
    return null;
};

export default StructuredData;
