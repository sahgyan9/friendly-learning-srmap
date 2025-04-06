
import { Mentor } from "@/types/mentor";

// Sample mentors for application testing
export const sampleMentors: Mentor[] = [
  {
    id: "1",
    name: "Dr. Sarah Chen",
    department: "Computer Science",
    skills: ["Quantum Computing", "Machine Learning", "Algorithms"],
    rating: 4.9,
    profile_image: "https://randomuser.me/api/portraits/women/44.jpg",
    linkedin_url: "https://linkedin.com/in/sarahchen",
    bio: "Quantum physicist turned software engineer with a passion for teaching complex concepts in simple ways. I specialize in quantum algorithms and their applications in machine learning.",
    review_count: 47,
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    name: "Prof. Michael Torres",
    department: "Physics",
    skills: ["Quantum Mechanics", "Python", "Data Analysis"],
    rating: 4.8,
    profile_image: "https://randomuser.me/api/portraits/men/32.jpg",
    linkedin_url: "https://linkedin.com/in/michaeltorres",
    bio: "Professor of Quantum Physics with 15 years of research experience. I help students bridge the gap between theoretical quantum concepts and practical programming implementations.",
    review_count: 38,
    created_at: "2024-01-20T14:15:00Z"
  },
  {
    id: "3",
    name: "Gyan Kumar Sah",
    department: "Electrical Engineering",
    skills: ["Quantum Circuits", "Circuit Design", "FPGA Programming"],
    rating: 4.7,
    profile_image: "https://randomuser.me/api/portraits/men/67.jpg",
    linkedin_url: "https://linkedin.com/in/gyanks",
    bio: "Electrical engineer specializing in quantum circuit design. I focus on helping students understand the hardware aspects of quantum computing and implement practical circuits.",
    review_count: 29,
    created_at: "2024-02-05T09:45:00Z"
  }
];
