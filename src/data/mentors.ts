
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
  },
  {
    id: "7",
    name: "Maya Patel",
    department: "Biotechnology",
    skills: ["Microbiology", "Biochemistry", "Lab Techniques"],
    rating: 4.7,
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/mayapatel",
    bio: "Biotechnology major with research experience. I can help with lab techniques and understanding complex biological processes.",
    reviewCount: 27
  },
  {
    id: "8",
    name: "David Kim",
    department: "Physics",
    skills: ["Quantum Mechanics", "Mathematics", "Scientific Computing"],
    rating: 4.9,
    profileImage: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/davidkim",
    bio: "Physics honors student passionate about quantum mechanics. I make complex physics concepts easy to understand.",
    reviewCount: 31
  },
  {
    id: "9",
    name: "Sophia Chen",
    department: "Mathematics",
    skills: ["Calculus", "Linear Algebra", "Probability"],
    rating: 4.8,
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/sophiachen",
    bio: "Math major with experience in tutoring. I specialize in making abstract mathematical concepts concrete and understandable.",
    reviewCount: 29
  },
  {
    id: "10",
    name: "Miguel Rodriguez",
    department: "Chemical Engineering",
    skills: ["Process Engineering", "Thermodynamics", "MATLAB"],
    rating: 4.6,
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/miguelrodriguez",
    bio: "Chemical engineering student specializing in process optimization. I can help with both theoretical concepts and practical applications.",
    reviewCount: 18
  },
  {
    id: "11",
    name: "Fatima Ali",
    department: "Psychology",
    skills: ["Research Methods", "Statistics", "Cognitive Psychology"],
    rating: 4.7,
    profileImage: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/fatimaali",
    bio: "Psychology major with research experience in cognitive studies. I can help with research design, data analysis, and understanding core concepts.",
    reviewCount: 22
  },
  {
    id: "12",
    name: "Alex Johnson",
    department: "Civil Engineering",
    skills: ["Structural Analysis", "AutoCAD", "Construction Management"],
    rating: 4.5,
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/alexjohnson",
    bio: "Civil engineering student with internship experience at construction firms. I can help with design software and understanding structural principles.",
    reviewCount: 16
  },
  {
    id: "13",
    name: "Lakshmi Narayanan",
    department: "Artificial Intelligence",
    skills: ["Deep Learning", "Computer Vision", "NLP"],
    rating: 4.9,
    profileImage: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/lakshminarayanan",
    bio: "AI specialist with research experience in computer vision. I can help with implementing neural networks and understanding ML concepts.",
    reviewCount: 34
  },
  {
    id: "14",
    name: "Zoe Williams",
    department: "Environmental Science",
    skills: ["Ecology", "GIS Mapping", "Sustainability"],
    rating: 4.6,
    profileImage: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/zoewilliams",
    bio: "Environmental science student passionate about sustainable practices. I can help with ecological concepts and environmental impact assessments.",
    reviewCount: 19
  },
  {
    id: "15",
    name: "Jamal Ibrahim",
    department: "Electrical Engineering",
    skills: ["Power Systems", "Renewable Energy", "Electronics"],
    rating: 4.7,
    profileImage: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/jamalibrahim",
    bio: "EE student specializing in renewable energy systems. I can help with circuit design, power systems, and electronics fundamentals.",
    reviewCount: 23
  },
  {
    id: "16",
    name: "Emma Thompson",
    department: "Communications",
    skills: ["Public Speaking", "Digital Media", "Content Creation"],
    rating: 4.8,
    profileImage: "https://images.unsplash.com/photo-1535324492437-d8dea70a38a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/emmathompson",
    bio: "Communications major with experience in digital marketing. I can help with presentation skills, content creation, and media strategy.",
    reviewCount: 27
  },
  {
    id: "17",
    name: "Raj Mehta",
    department: "Computer Science",
    skills: ["Mobile Development", "React Native", "UI/UX Design"],
    rating: 4.6,
    profileImage: "https://images.unsplash.com/photo-1518644730709-0835105d9daa?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/rajmehta",
    bio: "CS student specializing in mobile app development. I can help with React Native, UI/UX principles, and cross-platform solutions.",
    reviewCount: 20
  },
  {
    id: "18",
    name: "Lin Wei",
    department: "Finance",
    skills: ["Financial Analysis", "Investment", "Excel Modeling"],
    rating: 4.7,
    profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedinUrl: "https://linkedin.com/in/linwei",
    bio: "Finance major with internship experience at investment firms. I can help with financial modeling, analysis techniques, and investment concepts.",
    reviewCount: 25
  }
];
