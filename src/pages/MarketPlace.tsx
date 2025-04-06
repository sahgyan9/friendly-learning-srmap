import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PostCard } from "@/components/marketplace/PostCard";
import Navbar from "@/components/Navbar";

type Category = 'all' | 'news' | 'events' | 'ads' | 'courses';

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
        title: '🚀 Certified Ethical Hacking Course - Limited Time Offer!',
        description: `ARE YOU FASCINATED BY THE WORLD OF CYBERSECURITY? DO YOU WANT TO LEARN HOW TO DEFEND AGAINST CYBERATTACKS AND PROTECT SENSITIVE INFORMATION?

Why Choose Our Ethical Hacking Course?

• Instructors: Learn from youngest telugu experienced cybersecurity professionals with real-world expertise.
• Hands-on Training: Gain practical experience through labs and simulations.
• Industry-Relevant Curriculum: Covers the latest hacking techniques and tools.
• Flexible Learning: Weekly sessions to fit your schedule.
• Affordable Pricing: Get top-quality training at competitive rates.
• Recorded sessions
• Lifetime support
• IN TELUGU
• Duration 2months+ 30+hours
• Freelancing opportunity!

Schedule: Mon, Wed, Fri (7:00 pm to 8:00 pm)
Price: ₹1999/-

Contact: +91 7981047612
Email: udayvenkat102@gmail.com`,
        category: 'courses',
        date: '2024-03-17',
        author: 'Uday (CEH v12 Certified)',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format'
    },
    {
        id: '2',
        title: 'Annual Tech Fest 2024',
        description: 'Join us for the biggest technical festival of the year. Featuring workshops, competitions, and amazing prizes!',
        category: 'events',
        date: '2024-04-15',
        author: 'Student Council',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&auto=format'
    },
    {
        id: '3',
        title: 'New Computer Lab Opening',
        description: 'State-of-the-art computer lab with latest hardware and software is now open for students.',
        category: 'news',
        date: '2024-04-10',
        author: 'Admin',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format'
    }
];

const MarketPlace = () => {
    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleRegister = (url: string) => {
        window.open(url, '_blank');
    };

    const filteredPosts = samplePosts.filter(post =>
        activeCategory === 'all' || post.category === activeCategory
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">MarketPlace</h1>
                        <p className="text-sm text-muted-foreground mt-1">(Demo Version)</p>
                    </div>
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
                </div>

                <div className="flex-1">
                    <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveCategory(value as Category)}>
                        <TabsList className="grid w-full grid-cols-5 mb-8">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="news">University News</TabsTrigger>
                            <TabsTrigger value="events">Events</TabsTrigger>
                            <TabsTrigger value="ads">Advertisements</TabsTrigger>
                            <TabsTrigger value="courses">Course Materials</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeCategory}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPosts.map(post => (
                                    <div key={post.id}>
                                        <PostCard
                                            title={post.title}
                                            description={post.description}
                                            category={post.category}
                                            date={post.date}
                                            author={post.author}
                                            image={post.image}
                                            id={post.id}
                                            onView={() => handleRegister('https://forms.gle/4PP6PbrwbjUNSF8y7')}
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
};

export default MarketPlace; 