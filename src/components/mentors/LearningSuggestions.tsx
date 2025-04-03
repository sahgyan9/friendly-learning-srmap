
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Code, FileText, PenTool, Briefcase } from "lucide-react";

interface LearningSuggestion {
  title: string;
  description: string;
  type: "course" | "project" | "exercise" | "resource" | "practice";
}

interface LearningSuggestionsProps {
  suggestions: LearningSuggestion[];
}

const LearningSuggestions: React.FC<LearningSuggestionsProps> = ({ suggestions }) => {
  // Return null if there are no suggestions
  if (!suggestions || suggestions.length === 0) return null;
  
  // Function to get the correct icon based on suggestion type
  const getIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "project":
        return <Code className="h-5 w-5 text-green-500" />;
      case "exercise":
        return <PenTool className="h-5 w-5 text-purple-500" />;
      case "resource":
        return <FileText className="h-5 w-5 text-amber-500" />;
      case "practice":
        return <Briefcase className="h-5 w-5 text-red-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="mb-12">
      <h3 className="text-xl font-semibold mb-4">Learning Suggestions</h3>
      <p className="text-muted-foreground mb-6">
        Based on your search, here are some resources that might help you develop relevant skills.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {getIcon(suggestion.type)}
                <CardTitle className="text-base font-medium">{suggestion.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                  {suggestion.type}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LearningSuggestions;
