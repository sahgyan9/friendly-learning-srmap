import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FilterSidebarProps {
    onFilterChange: (filters: any) => void;
}

export function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
    return (
        <div className="w-64 space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Sort By</h3>
                <RadioGroup defaultValue="latest">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="latest" id="latest" />
                        <Label htmlFor="latest">Latest</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="popular" id="popular" />
                        <Label htmlFor="popular">Most Popular</Label>
                    </div>
                </RadioGroup>
            </div>

            <Separator />

            <div>
                <h3 className="text-lg font-semibold mb-4">Categories</h3>
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="news" />
                        <Label htmlFor="news">University News</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="events" />
                        <Label htmlFor="events">Events</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="ads" />
                        <Label htmlFor="ads">Advertisements</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="courses" />
                        <Label htmlFor="courses">Course Materials</Label>
                    </div>
                </div>
            </div>

            <Separator />

            <div>
                <h3 className="text-lg font-semibold mb-4">Date Range</h3>
                <RadioGroup defaultValue="all">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">All Time</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="today" id="today" />
                        <Label htmlFor="today">Today</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="week" id="week" />
                        <Label htmlFor="week">This Week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="month" />
                        <Label htmlFor="month">This Month</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="pt-4">
                <Button className="w-full" variant="outline">Reset Filters</Button>
            </div>
        </div>
    );
} 