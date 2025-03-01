
export interface Mentor {
  id: string;
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profileImage: string;
  linkedinUrl?: string;
  bio?: string;
  reviewCount: number;
}

export const mentors: Mentor[] = [
  {
    id: "1",
    name: "Priya Sharma",
    department: "Computer Science",
    skills: ["Python", "Data Structures", "Machine Learning"],
    rating: 4.8,
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/priyasharma",
    bio: "Senior CS student passionate about AI and machine learning. I love helping juniors understand complex programming concepts.",
    reviewCount: 24
  },
  {
    id: "2",
    name: "Arjun Patel",
    department: "Electrical Engineering",
    skills: ["Circuit Design", "MATLAB", "IoT"],
    rating: 4.6,
    profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/arjunpatel",
    bio: "Final year EE student working on IoT projects. Happy to guide students with circuit design and programming.",
    reviewCount: 18
  },
  {
    id: "3",
    name: "Neha Reddy",
    department: "Computer Science",
    skills: ["Java", "Web Development", "Algorithms"],
    rating: 4.9,
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/nehareddy",
    bio: "Experienced in web development and competitive programming. I enjoy simplifying complex concepts for newcomers.",
    reviewCount: 32
  },
  {
    id: "4",
    name: "Rahul Verma",
    department: "Mechanical Engineering",
    skills: ["CAD", "Fluid Mechanics", "Thermodynamics"],
    rating: 4.7,
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/rahulverma",
    bio: "Senior ME student specializing in CAD and simulation. I can help with design projects and theoretical concepts.",
    reviewCount: 15
  },
  {
    id: "5",
    name: "Aisha Khan",
    department: "Business Administration",
    skills: ["Marketing", "Business Strategy", "Finance"],
    rating: 4.5,
    profileImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/aishakhan",
    bio: "Business student with internship experience at major corporations. Can guide you through business case studies and marketing projects.",
    reviewCount: 22
  },
  {
    id: "6",
    name: "Vikram Singh",
    department: "Computer Science",
    skills: ["Cybersecurity", "Networking", "C++"],
    rating: 4.4,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/vikramsingh",
    bio: "Cybersecurity enthusiast with CTF competition experience. I can help with network security concepts and programming.",
    reviewCount: 19
  }
];
