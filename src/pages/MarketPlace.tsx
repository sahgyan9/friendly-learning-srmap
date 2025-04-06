import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { PostCard } from "@/components/marketplace/PostCard";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";

type Category = 'news' | 'events' | 'ads' | 'courses';

interface Post {
    id: string;
    title: string;
    description: string;
    category: Category;
    date: string;
    image?: string;
    author: string;
}

// Sample data - replace with actual data from your backend
const samplePosts: Post[] = [
    {
        id: '1',
        title: 'Annual Tech Fest 2024',
        description: 'Join us for the biggest technical festival of the year. Featuring workshops, competitions, and amazing prizes!',
        category: 'events',
        date: '2024-04-15',
        author: 'Student Council',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format'
    },
    {
        id: '2',
        title: 'New Computer Lab Opening',
        description: 'State-of-the-art computer lab with latest hardware and software is now open for students.',
        category: 'news',
        date: '2024-04-10',
        author: 'Admin',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format'
    },
    {
        id: '3',
        title: 'Data Structures Textbook for Sale',
        description: 'Slightly used Data Structures textbook in excellent condition. Perfect for CS students.',
        category: 'courses',
        date: '2024-04-08',
        author: 'John Doe',
    }
];

export default function MarketPlace() {
    const [activeCategory, setActiveCategory] = useState<Category>('news');
    const [searchQuery, setSearchQuery] = useState('');

    const handleFilterChange = (filters: any) => {
        // Implement filter logic
        console.log('Filters changed:', filters);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">MarketPlace</h1>
                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button variant="default">Post New</Button>
                </div>
            </div>

            <div className="flex gap-8">
                <FilterSidebar onFilterChange={handleFilterChange} />

                <div className="flex-1">
                    <Tabs defaultValue="news" className="w-full" onValueChange={(value) => setActiveCategory(value as Category)}>
                        <TabsList className="grid w-full grid-cols-4 mb-8">
                            <TabsTrigger value="news">University News</TabsTrigger>
                            <TabsTrigger value="events">Events</TabsTrigger>
                            <TabsTrigger value="ads">Advertisements</TabsTrigger>
                            <TabsTrigger value="courses">Course Materials</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeCategory}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {samplePosts
                                    .filter(post => post.category === activeCategory)
                                    .map(post => (
                                        <div key={post.id}>
                                            <PostCard
                                                title={post.title}
                                                description={post.description}
                                                category={post.category}
                                                date={post.date}
                                                author={post.author}
                                                image={post.image}
                                                id={post.id}
                                                onView={() => console.log('View post:', post.id)}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
} 