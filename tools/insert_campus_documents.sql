-- Ingestion of Campus Documents
DELETE FROM public.campus_documents WHERE document_slug IN ('academic-calendar-2026-27', 'code-of-conduct');

INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'Odd Semester Key Academic Dates & Timelines', 'Page 1 of 17 
 
SRM University-AP, Andhra Pradesh 
Academic Calendar (AY 2026-27) 
Applicable to All Semesters All Programs of UG, PG & PhD  
S. No. 
                            Details                         Alternate 
Date 
Day 
Odd Semester - AY 2026-27 
1. 
Semester Course Pre-Registration/Course Choice Filling 
03.06.2026 
Wednesday 
2. 
Commencement of Academic Registration 
02.07.2026 
Thursday 
3. 
Finalization of Timetable 
02.07.2027 
Thursday 
4. 
Convocation-2026(Tentative) 
01.08.2026 
Saturday 
5. 
Commencement of Classes 
03.08.2026 
Monday 
6. 
Last Date for the Re-registration of the Arrear Courses 
06.08.2026 
Thursday 
7. 
Last date of Academic and Course Registration with Late 
Fee  
17.08.2026 
Monday 
8. 
Issue of Struck off notice and course registration with 
readmission fee 
18.08.2026 
Tuesday 
9. 
Last Date to Enter CLA-1 Marks in ERP 
23.09.2026 
Wednesday 
10. Midterm Examinations/ Assessments 
28.09.2026 
01.10.2026 
Monday 
Thursday 
11. Last Date to Enter Midterm Marks in ERP 
09.10.2026 
Friday 
12. Date of Release of End Term Exam Schedule  
26.10.2026 
Monday 
13. Window for filling End-Term Feedback 
28.10.2026 
05.11.2026 
Wednesday 
Thursday 
14. Examination Registration  
29.10.2026 
06.11.2026 
Thursday 
Friday 
15. Last Date to Enter CLA-2 Marks in ERP 
02.11.2026 
Monday 
16. Window for Semester Practical Examinations 
13.11.2026 
27.11.2026 
Friday  
Friday 
17. Last Date to Enter CLA-3 Marks in ERP 
27.11.2026 
Friday 
18. Last Day of Teaching 
30.11.2026 
Monday 
19. Last Date for Submission of Assessment Marks of 
Project/ Seminar/ Internship/ Practical Courses 
30.11.2026 
Monday 
20. Publishing Students Attendance Shortage    
02.12.2026 
Wednesday 
21. Window for End-Term Examinations  
07.12.2026 
21.12.2026 
Monday 
Monday 
22. Window for End-Term Examinations Grade Submission 
to the office of Controller of Examinations 
10.12.2026 
26.12.2026 
Thursday 
Saturday 
23. Window for End-Semester Arrear Examinations 
22.12.2026 
31.12.2026  
Tuesday 
Thursday 
24. Date of Result Declaration  
05.01.2027 
Tuesday 
25. Last Date to Submit the Course Files by Faculty to the 
Respective Departments 
12.01.2027 
Tuesday 
26. Faculty Semester Data Submission in Intranet Portal 
12.01.2027 
Tuesday 
27. Last Date to Apply for End-term Re-evaluation 
15.01.2027 
Friday 
28. Winter Break for Students 
22.12.2026 
03.12.2026 
Tuesday 
Sunday', 1, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'Even Semester Key Academic Dates & Timelines', 'Page 2 of 17 
 
 
S. No. 
Details 
Alternate 
Date 
Day 
Even Semester - AY 2026-27 
1.  Semester Course Pre-Registration/Course Choice Filling 
23.11.2026 
Monday 
2.  Commencement of Academic Registration 
14.12.2026 
Tuesday 
3.  Finalization of Timetable 
14.12.2026 
Tuesday 
4.  Commencement of Classes 
04.01.2027 
Monday 
5.  Last Date for the Re-registration of the Arrear Courses 
07.01.2027 
Thursday 
6.  Issue of Struck off notice and course registration with 
readmission fee  
19.01.2027 
Tuesday 
7.  Last Date to Enter CLA-1 Marks in ERP 
24.02.2027 
Wednesday 
8.  Mid-Term Examinations/Assessments  
01.03.2027 
04.03.2027 
Monday 
Thursday 
9.  Last Date to Enter Midterm Marks in ERP 
12.03.2027 
Friday 
10.  Date of Release of End Term Exam Schedule 
25.03.2027 
Thursday 
11.  Window for Filling End-Term Feedback 
31.03.2027 
08.04.2027 
Wednesday 
Thursday 
12.  Examination Registration  
01.04.2027 
09.04.2027 
Thursday 
Friday 
13.  Last Date to Enter CLA-2 Marks in ERP 
07.04.2027 
Wednesday 
14.  Window for Semester Practical Examinations 
13.04.2027 
29.04.2027 
Tuesday 
Thursday 
15.  Publishing Students Attendance Shortage   
29.04.2027 
Thursday  
16.  Last Date to Enter CLA-3 Marks in ERP 
29.04.2027 
Thursday  
17.  Last Day of Teaching 
30.04.2027 
Friday  
18.  Last Date for Submission of Assessment Marks of Project/ 
Seminar/ Internship/ Practical Courses 
03.05.2027 
Monday 
19.  Window for End-Term Examinations 
03.05.2027 
15.05.2027 
Monday 
Saturday 
20.  Window for End-Term Examinations Grade Submission to 
the office of Controller of Examinations 
07.05.2027 
19.05.2027 
Friday 
Wednesday 
21.  Window for End-Semester Arrear Examinations 
15.05.2027 
31.05.2027 
Saturday 
Monday  
22.  Date of Result Declaration 
31.05.2027 
Monday 
23.  Last Date to Apply for End-term Re-evaluation 
10.06.2027 
Thursday  
24.  Last Date to Submit the Course Files by Faculty to the 
Respective Departments 
10.06.2027 
Thursday 
25.  Faculty Semester Data Submission in Intranet Portal 
10.06.2027 
Thursday 
26.  Commencement of Summer Break for Students 
 
22.05.2027 
Saturday  
Summer Term -AY 2026-27 (Optional) 
1.     
Last Date for Summer Term Registration 
01.06.2027 
Tuesday 
2.     
Commencement of Classes 
02.06.2027 
Wednesday 
3.     
Window for Summer Term Examinations 
02.08.2027 
04.08.2027 
Monday 
Wednesday  
4.     
Date of Result Declaration 
09.08.2027 
Monday', 2, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'Odd Semester Working Days, Day Orders & Holidays', 'Page 3 of 17 
 
Working Days for the Odd Semester -AY 2026-27 
  
Month 
Total 
Working 
days 
Day 
July-26 
        August-26 
    September-26 
      October-26 
November-26 
    December-26 
Mon 
6 
13 
20 
27 
3 
10 
17 
24 
31 
 
7 
H 
21 
28 
 
5 
12 
19 
26 
2 
9 
16 
23 
30 
 
7 
14 
21 
28 
20 
Tue 
7 
14 
21 
28 
4 
11 
18 
H 
 
1 
8 
15 
22 
29 
 
6 
13 
H 
27 
3 
10 
17 
H 
 
1 
8 
15 
22 
29 
17 
Wed 
8 
15 
22 
29 
5 
12 
19 
26 
 
2 
9 
16 
23 
30 
 
7 
14 
21 
28 
4 
11 
18 
25 
 
2 
9 
16 
23 
30 
20 
Thu 
9 
16 
23 
30 
6 
13 
20 
27 
 
3 
10 
17 
24 
 
1 
8 
15 
22 
29 
5 
12 
19 
26 
 
3 
10 
17 
24 
31 
20 
Fri 
10 
17 
24 
31 
7 
14 
H 
28 
 
H 
11 
18 
25 
 
H 
9 
16 
23 
30 
6 
13 
20 
27 
 
4 
11 
18 
H 
 
17 
Sat 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
12 
19 
 
 
02 
Total 
Days 
0 
19 
20 
20 
  
20 
17 
96 
 
 
 
       
 
 
 
 
 
 
 
 
 
 
 
Note: Holidays are subject to change as per the AP Government notification 
 
 
S. No. 
Occasion/ Festival 
Date 
Day 
1.  Varalakshmi Vratam 
21.08.2026 
Friday 
2.  Eid Milad-Un-Nabi 
25.08.2027 
Tuesday 
3.  Sri Krishna Astami 
04.09.2026 
Friday 
4.  Vinayakachavithi 
14.09.2026 
Monday 
5.  Mahatma Gandhi Jayanthi 
02.10.2027 
Friday 
6.  Vijayadasami/Dussehra 
20.10.2026 
Tuesday 
7.  Guru Nanak 
Jayanthi/Karthika Purnima 
24.11.2026 
Tuesday 
8.  Christmas 
25.12.2026 
Friday 
The Following Festivals occur on Saturday & Sunday 
S. No. Occasion/ Festival 
Date 
Day 
1.  Independence Day 
15.08.2026 
Saturday 
2.  Durgastami 
18.10.2026 
Sunday 
3.  Deepavali 
08.11.2026 
Sunday', 3, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'Even Semester Working Days, Day Orders & Holidays', 'Page 4 of 17 
 
Working Days for the Even Semester -AY 2026-27 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Note: Holidays are subject to change as per the AP Government notification 
Month 
Total 
Working 
Days 
Day 
January-27 
February-27 
March-27 
April-27 
May-27 
June-27 
Mon 
  
4 
11 
18 
25 
1 
8 
15 
22 
1 
8 
15 
H 
29 
  
H 
12 
19 
26 
3 
10 
H 
24 
31 
  
7 
14 
21 
28 
17 
Tue 
  
5 
12 
19 
H 
2 
9 
16 
23 
2 
9 
16 
23 
30 
  
6 
13 
20 
27 
4 
11 
18 
25 
  
1 
8 
H 
22 
29 
19 
Wed 
  
6 
13 
20 
27 
3 
10 
17 
24 
3 
H 
17 
24 31 
  
7 
H 
21 
28 
5 
12 
19 
26 
  
2 
9 
16 
23 
30 
18 
Thu 
  
7 
H 
21 
28 
4 
11 
18 
25 
4 
11 
18 
25   
1 
H 
H 
22 
29 
6 
13 
20 
27 
  
3 
10 
17 
24 
  
17 
Fri 
1 
8 
H 
22 
29 
5 
12 
19 
26 
5 
12 
19 
H 
  
2 
9 
16 
23 
30 
7 
14 
21 
28 
  
4 
11 
18 
25 
  
18 
Sat 
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
8 
15 
  
  
  
  
  
  
  
  
02 
Total 
Days 
17 
20 
20 
18 
16 
0 
91 
S. No. 
Occasion/ Festival 
Date 
Day 
1.  Bhogi 
14.01.2027 
Thursday 
2.  Pongal/Sankranthi 
15.01.2027 
Friday 
3.  Republic Day 
26.01.2027 
Tuesday 
4.  Ramzan (EID-UL-FITR) 
10.03.2027 
Wednesday 
5.  Holi 
22.03.2027 
Monday 
6.  Good Friday 
26.03.2027 
Friday 
7.  Babu Jagjivan Ram''s 
Birthday 
05.04.2027 
Monday 
8.  Ugadi 
08.04.2027 
Thursday 
9.  Dr. B.R Ambedkar ''s 
Birthday 
14.04.2027 
Wednesday 
10.  Sri Rama Navami 
15.04.2027 
Thursday 
11.  Bakrid (EID-UL-ZUHA) 
17.05.2027 
Monday 
12.  Muharrum 
15.06.2027 
Tuesday 
The Following Festivals occur on Saturday & Sunday 
S. No. Occasion/ Festival 
Date 
Day 
1.  
Kanuma 
16.01.2027 
Saturday', 4, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'University Events, Fests, Workshops & Conferences Schedule (AY 2026-27)', 'Page 5 of 17 
 
Events AY 2026-27 
S. 
No. 
Name of the Event 
Organizing 
Department/School/Directorate/Office 
From Date 
- To Date 
 Day 
1.  Next Generation Intelligent Systems 
Department of Computer Science and 
Engineering 
01.07.2026 
06.07.2026 
Wednesday 
Monday 
2.  05-Day Faculty Training Program for the 
newly joined faculty members  
Teaching Learning Center 
13.07.2026 
17.07.2026 
Monday 
Friday 
3.  UDL 24 
Office of Dean-Research 
15.07.2026 
Wednesday 
4.  Awareness on Student Policies /          
Anti-Ragging 
Directorate of Student Affairs 
03.08.2026 
Monday 
5.  2-Day GDG Dev Fest 
Department of Computer Science and 
Engineering 
07.08.2026 
08.08.2026 
Friday 
Saturday 
6.  
Entry Skills Assessment for all the UG 1st 
year students (Students’ Orientation 
Program) - 1 
Teaching Learning Center 
12.08.2026 
Wednesday 
7.  Swearing-In of New Student Council 
(Orientation) 
Directorate of Student Affairs 
14.08.2026 
Friday 
8.  
Entry Skills Assessment for all the UG 1st 
year students (Students’ Orientation 
Program) - 2 
Teaching Learning Center 
14.08.2026 
Friday 
9.  Independence Day Celebration 
Directorate of Student Affairs 
15.08.2026 
Saturday 
10. Invited Talk 
Department of Mechanical Engineering 
16.08.2026 
17.08.2026 
Sunday 
Monday 
11. World Photography Day 
Directorate of Student Affairs 
19.08.2026 
Wednesday 
12. Awareness on No-Plastic Usage 
Directorate of Student Affairs 
20.08.2026 
Thursday 
13. 
2nd International Conference on 
Intelligent Computing and Emerging 
Communication Technologies (ICEC 2026) 
Department of Computer Science and 
Engineering 
21.08.2026 
23.08.2026 
Friday 
Sunday

Page 6 of 17 
 
14. Prerna Vanam (Tree Plantation) 
Directorate of Student Affairs 
24.08.2026 
Monday 
15. Hands on Robotics Workshop 
Department of Mechanical Engineering 
28.08.2026 
29.08.2026 
Friday 
Saturday 
16. National Sports Day 
Directorate of Sports 
29.08.2026 
Saturday 
17. Inter-School Championship 
Directorate of Sports 
31.08.2026 
04.09.2026 
Monday 
Friday 
18. Onam Celebration 
Directorate of Student Affairs 
02.09.2026 
Wednesday 
19. Krishna Janmashtami Celebration 
Directorate of Student Affairs 
03.09.2026 
Thursday 
20. Workshop on How to write a Journal 
Paper 
Department of Mechanical Engineering 
04.09.2026 
Friday 
21. Teachers’ Day Celebration 
Directorate of Student Affairs 
05.09.2026 
Saturday 
22. FDP on Research Methodology  
Department of Sociology and 
Anthropology 
05.09.2026 
09.09.2026 
Saturday 
Wednesday 
23. 
Entry Skills Assessment for all the UG 1st 
year students (Students’ Orientation 
Program) - 2 
Department of TLC 
09.09.2026 
Wednesday 
24. World Suicide Prevention Day 
Directorate of Student Affairs 
10.09.2026 
Thursday 
25. Industry-Based Workshop 
Department of Mechanical Engineering 
10.09.2026 
Thursday 
26. Ganesh Chaturthi Celebration 
Directorate of Student Affairs 
11.09.2026 
Friday 
27. Aloha Freshers Fest 
Directorate of Student Affairs 
11.09.2026 
12.09.2026 
Friday 
Saturday 
28. PhySpark workshop 
Department of Physics 
19.09.2026 
Saturday

Page 7 of 17 
 
29. Hands On Robotic Workshop 
Department of Mechanical Engineering 
19.09.2026 
20.09.2026 
Saturday 
Sunday 
30. NSS Day 
Directorate of Student Affairs 
24.09.2026 
Thursday 
31. Inter-Hostel Championship 
Directorate of Sports 
21.09.2026 
24.09.2026 
Monday 
Thursday 
32. Industrial Visit 
Department of Mechanical Engineering 
26.09.2026 
Saturday 
33. 25th UDL 
Office of Dean-Research 
30.09.2026 
Wednesday 
34. Gandhi Jayanti Celebration 
Directorate of Student Affairs 
02.10.2026 
Friday 
35. Hands On Robotic Workshop 
Department of Mechanical Engineering 
02.10.2026 
03.10.2026 
Friday 
Saturday 
36. Amaravati Literature Festival 
Department of Literature and Languages 
07.10.2026 
09.10.2026 
Wednesday 
Friday 
37. 4th Research Scholar’s Summit 
Office of Dean-Research 
08.10.2026 
09.10.2026 
Thursday 
Friday 
38. Orientation 
Directorate of IRHS 
09.10.2026 
Friday 
39. World Mental Health Day 
Directorate of Student Affairs 
10.10.2026 
Saturday 
40. Diplomats DAY 
Directorate of IRHS 
15.10.2026 
Thursday 
41. Navratri (Garba Night) 
Directorate of Student Affairs 
16.10.2026 
Friday 
42. ESE-Workshop 
Department of Environmental Science and 
Engineering 
23.10.2026 
Friday 
43. Gender Diversity / Gender Equality Session 
Directorate of Student Affairs 
27.10.2026 
Tuesday

Page 8 of 17 
 
44. Nextronics Club Anniversary 
Department of Electronics and 
Communication Engineering  
02.11.2026 
06.11.2026 
Monday 
Friday 
45. Workshop On Advanced Manufacturing 
Facilities 
Department of Mechanical Engineering 
02.11.2026 
03.11.2026 
Monday 
Tuesday  
46. Model United Nations (MUN) 
Directorate of Student Affairs 
04.11.2026 
05.11.2026 
Wednesday 
Thursday 
47. AIRIM Conference 
Department of Mechanical Engineering 
05.11.2026 
07.11.2026 
Thursday 
Saturday 
48. Diwali Celebrations 
Directorate of Student Affairs 
08.11.2026 
Sunday 
49. Faculty Development Program with (CMU) 
Department of TLC 
09.11.2026 
13.11.2026 
Monday 
Friday 
50. National Education Day 
Directorate of Student Affairs 
11.11.2026 
Wednesday 
51. Literature Event (LIT Fest) 
Directorate of Student Affairs 
12.11.2026 
13.11.2026 
Thursday 
Friday 
52. 
International Conference on Quantum, 
Artificial Intelligence, and Connected 
Systems (QAIC 2026) (Tentative) 
Department of Computer Science and 
Engineering 
12.11.2026 
14.11.2026 
Thursday 
Saturday 
53. FIT India Program 
Directorate of Sports 
12.11.2026 
14.11.2026 
Thursday 
Saturday 
54. Children’s Day 
Directorate of Student Affairs 
14.11.2026 
Saturday 
55. International Students Day 
Directorate of IRHS 
14.11.2026 
17.11.2026 
Saturday 
Tuesday 
56. Success Mantra for Managers 
Department of Management 
17.11.2026 
Tuesday 
57. 
International conference on International 
Conference on Emerging Materials, Devices, 
and Applications(I-CENDA) 
Department of Electronics and 
Communication Engineering  
18.11.2026 
19.11.2026 
Wednesday 
Thursday

Page 9 of 17 
 
58. Tech-Fest 
Office of Dean-SEAS/Directorate of Student 
Affairs 
19.11.2026 
20.11.2026 
Thursday 
Friday 
59. Physical Book Exhibition 
Central Library 
19.11.2026 
21.11.2026 
Thursday 
Saturday 
60. PhySpark workshop 
Department of Physics 
21.11.2026 
Saturday 
61. NCC Day 
Directorate of Student Affairs 
22.11.2026 
Sunday 
62. Recent advances in Healthcare 
Technologies 
Department of Electronics and 
Communication Engineering 
25.11.2026 
27.11.2026 
Wednesday 
Friday 
63. Invitational U-19 Cricket Tournament 
Directorate of Sports 
25.11.2026 
30.11.2026 
Wednesday 
Monday 
64. Cinevie 
Directorate of Student Affairs 
26.11.2026 
Thursday 
65. 
International Conference on Intelligent 
Computing and Emerging Communication 
Technologies 
Department of Computer Science and 
Engineering 
26.11.2026 
28.11.2026 
Thursday 
Saturday 
66. Global Education Summit 
Directorate of IRHS 
27.11.2026 
Friday 
67. ESE-Workshop 
Department of Environmental Science and 
Engineering 
04.12.2026 
Friday 
68. Armed Forces Flag Day 
Directorate of Student Affairs 
07.12.2026 
Monday 
69. 26th UDL 
Office of Dean-Research 
09.12.2026 
Wednesday 
70. International conference in Robotics, AI and 
Intelligent Manufacturing - AIRIM - 2026 
Department of Mechanical Engineering 
10.12.2026 
12.12.2026 
Thursday 
Saturday 
71. International Conference 
Department of Literature and Languages 
17.12.2026 
18.12.2026 
Thursday 
Friday 
72. Emergent Phenomena in Condensed, 
Biological, and Quantum Matter 
Department of Physics 
17.12.2026 
19.12.2026 
Thursday 
Saturday

Page 10 of 17 
 
73. IBC Conference 
Department of Environmental Science and 
Engineering 
21.12.2026 
24.12.2026 
Monday 
Thursday 
74. Christmas Celebration 
Directorate of Student Affairs 
25.12.2026 
Friday 
75. 4th Alumni Day 
Directorate of Alumni Affairs 
25.12.2026 
Friday 
76. Physics 2026 National Conference 
Office of Dean Research 
27.12.2026 
29.12.2026 
Sunday 
Tuesday 
77. Biomedical Workshop 
Department of Electronics and 
Communication Engineering  
28.12.2026 
01.01.2027 
Monday 
Friday 
78. Faculty Training Program for the Newly 
Joined Faculty Members  
Teaching Learning Center  
28.12.2026 
01.01.2027 
Monday 
Friday 
79. Faculty Sports Championship 
Directorate of Sports 
31.12.2026 
01.01.2026 
Thursday 
Friday 
80. New Year Celebration 
Directorate of Student Affairs 
01.01.2027 
Friday 
81. PSB Industry Conclave 
Department of Management 
08.01.2027 
Friday 
82. Hands on Robotic Workshop 
Department of Mechanical Engineering 
08.01.2027 
Friday 
83. National Youth Day 
Directorate of Student Affairs 
12.01.2027 
Tuesday 
84. Pongal Celebration 
Directorate of Student Affairs 
14.01.2027 
Thursday 
85. Shanti Swarup Bhatnagar Awardee Lecture 
Department of Environmental Science and 
Engineering 
15.01.2027 
Friday 
86. Annual Athletics Meet 
Directorate of Sports 
20.01.2027 
22.01.2027 
Wednesday 
Friday 
87. Subhash Chandra Bose Jayanti 
Directorate of Student Affairs 
23.01.2027 
Saturday

Page 11 of 17 
 
88. Electoral Day / Electoral Literacy 
Directorate of Student Affairs 
25.01.2027 
Monday 
89. Republic Day Celebration 
Directorate of Student Affairs 
26.01.2027 
Tuesday 
90. Summer Internships Fair  
Directorate of IRHS 
27.01.2027 
Wednesday 
91. Recent advances in Healthcare 
Technologies 
Department of Electronics and 
Communication Engineering  
27.01.2027 
29.01.2027 
Wednesday 
Friday 
92. AMEYA (Business Fest) 
Department of Management 
28.01.2027 
29.01.2027 
Thursday 
Friday 
93. Hands on Robotics Workshop 
Department of Mechanical Engineering 
29.01.2027 
30.01.2027 
Friday 
Saturday 
94. Academic and Administrative Audit 
Office of Dean QAR  
01.02.2027 
10.03.2027 
Monday 
Wednesday 
95. SRM-AP Premier Leagues 
Directorate of Sports 
01.02.2027 
28.02.2027 
Monday 
Sunday 
96. History Seminar 
Department of History 
04.02.2027 
05.02.2027 
Thursday 
Friday 
97. PSB Annual Research Conference 
Department of Management 
05.02.2027 
Friday 
98. Workshop 
Department of Mechanical Engineering 
11.02.2027 
12.02.2027 
Thursday 
Friday 
99. 20th Innovation in Software Emerging 
Conference  
Department of Computer Science and 
Engineering 
11.02.2027 
13.02.2027 
Thursday 
Saturday 
100. We Meet 2.0 
Department of Environmental Science and 
Engineering 
11.02.2027 
13.02.2027 
Thursday 
Saturday 
101. Conference 
Department of Sociology and Anthropology  15.02.2027 
16.02.2027 
Monday 
Tuesday 
102. Infinitus Cultural Fest 
Directorate of Student Affairs 
18.02.2027 
19.02.2027 
Thursday 
Friday

Page 12 of 17 
 
103. PhySpark workshop 
Department of Physics 
20.02.2027 
Saturday 
104. Mathrubhasha Diwas 
Directorate of Student Affairs 
21.02.2027 
Sunday 
105. SAP Success meet 
Directorate of IRHS 
24.02.2027 
Wednesday 
106. 12th ACCMS- Asian Consortium on 
Computational Materials Science 
Office of Dean Research 
25.02.2027 
27.02.2027 
Thursday 
Saturday 
107. WE Meet Conference 
Department of Environmental Science and 
Engineering 
25.02.2027 
Thursday 
108. World Wildlife Day 
Department of Environmental Science and 
Engineering 
03.03.2025 
Wednesday 
109.
2nd National Conference on Status and 
Opportunities in Functional Energy and 
Electronic Materials (SOFEEM 2027) 
Department of Physics 
04.03.2027 
06.03.2027 
Thursday 
Saturday 
110. International Women’s Day 
Directorate of Student Affairs 
08.03.2027 
Monday 
111. International Conference 
Department of Literature and Languages 
09.03.2027 
Tuesday 
112. No Smoking Day 
Directorate of Student Affairs 
10.03.2027 
Wednesday 
113. 27th UDL 
Office of Dean-Research 
10.03.2027 
Wednesday 
114. Conference 
Department of Political Science 
11.03.2027 
12.03.2027 
Thursday 
Friday 
115.
International conference on International 
Conference on Emerging Materials, Devices, 
and Applications(I-CENDA) 
Department of Electronics and 
Communication Engineering  
15.03.2027 
16.03.2027 
Monday 
Tuesday 
116. Inter-Hostel E-Sports Championship 
Directorate of Sports 
17.03.2027 
20.03.2027 
Wednesday 
Saturday

Page 13 of 17 
 
117. Celebration of the Easter/Ramadan/Ugadi   
Directorate of IRHS 
17.03.2027 
Wednesday 
118. Natyaswara 
Directorate of Student Affairs 
18.03.2027 
Thursday 
119. Awareness on Code of Conduct & Ethics 
Directorate of Student Affairs 
19.03.2027 
Friday 
120. International Day of Happiness 
Directorate of Student Affairs 
20.03.2027 
Saturday 
121. Holi Celebrations 
Directorate of Student Affairs 
23.03.2027 
Tuesday 
122. Trending Issues in Management 
Department of Management 
25.03.2027 
Thursday 
123. World Theatre Day 
Directorate of Student Affairs 
27.03.2027 
Saturday 
124. Youth fest Invitation Tournaments 
Directorate of Sports 
29.03.2027 
31.09.2027 
Monday 
Wednesday 
125. Paridhan (Cultural Event) 
Directorate of Student Affairs 
01.04.2027 
Thursday 
126. Valedictory & New Student Council 
Announcement 
Directorate of Student Affairs 
01.04.2027 
Thursday 
127. 3-Day Symposium on Thermo-Fluid 
Engineering 
Department of Mechanical Engineering 
05.10.2026 
07.10.2026 
Tuesday 
Wednesday  
128. B.R. Ambedkar Remembrance Day 
Directorate of Student Affairs 
14.04.2027 
Wednesday 
129. ESE-Workshop 
Department of Environmental Science and 
Engineering 
16.04.2027 
Friday 
130. 11th Research Day 
Office of Dean-Research 
21.04.2027 
Wednesday 
131. World Earth Day 
Directorate of Student Affairs 
22.04.2027 
Thursday

Page 14 of 17 
 
132. Open House Project  
Department of Electronics and 
Communication Engineering  
22.04.2027 
Thursday 
133. Shanti Swarup Bhatnagar Awardee Lecture 
Department of Environmental Science and 
Engineering 
23.04.2027 
Friday 
134. Farewell Day 
Directorate of Student Affairs 
30.04.2027 
Friday 
135. World Blood Donor Day 
Directorate of Student Affairs 
14.06.2027 
Monday 
136. International Day of Yoga 
Directorate of Sports 
21.06.2027 
Monday 
137. World Music Day 
Directorate of Student Affairs 
21.06.2027 
Monday 
138. 05-Day Faculty Training Program for the 
newly joined faculty members  
Teaching Learning Center 
21.06.2027 
25.06.2027 
Monday 
Friday 
139. International Yoga Day 
Directorate of Sports 
21.06.2027 
Monday 
140. International Day Against Drug Abuse 
Directorate of Student Affairs 
26.06.2027 
Saturday 
141. International Chess Day 
Directorate of Sports 
20.07.2027 
Tuesday 
142. Sports Quota Selection Trails 
Directorate of Sports 
July 2026  
 
143. Freshers Orientation 
Directorate of Student Affairs 
August 2026 
(Tentative) 
 
144. Clubs Swearing-In Ceremony 
Directorate of Student Affairs 
August 2026 
 
145. Open House sessions for Various dept. 
Directorate of IRHS 
November 
2026 (3rd 
week) 
 
146. Open House sessions for Various dept. 
Directorate of IRHS 
January 
2027 (3rd 
week)

Page 15 of 17 
 
147. Sports Quota Selection Trails 
Directorate of Sports 
February 
2027 
 
148. Hostel Day 
Directorate of Student Affairs 
April 2027 
(Tentative) 
 
149. Monthly Meetings with International 
Students 
Directorate of IRHS 
Last week of 
Every Month 
 
150. Mobility Alumni Interaction Webinar 
Directorate of IRHS 
Discussion 
Meeting 
 
151. UGC-Related Events 
Directorate of Student Affairs 
As Notified 
 
152. South Zone AIU 
Directorate of Sports 
As per AIU 
National 
Calander 
 
153. Miscellaneous Events 
Directorate of Student Affairs 
As Required', 5, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('academic-calendar-2026-27', 'Academic Calendar AY 2026-27', '2026-27', 'academic_calendar', 'Statutory Meetings (Academic Council, Finance Committee, Governing Body)', 'Page 16 of 17 
 
Statutory Meetings (Tentative) 
AY 2026-27 
 
S. No. 
Event 
Date 
Day 
1 
29th Academic Council Meeting 
15.07.2026 
Wednesday 
2 
30th Academic Council Meeting 
30.10.2026 
Wednesday 
3 
31st Academic Council Meeting 
10.02.2027 
Wednesday 
4 
32nd Academic Council Meeting 
19.05.2027 
Wednesday 
5 
22nd Finance Committee Meeting 
17.07.2026 
Friday 
6 
23rd Finance Committee Meeting 
16.11.2026 
Monday 
7 
24th Finance Committee Meeting 
15.03.2027 
Monday 
8 
25th Finance Committee Meeting 
14.06.2027 
Monday 
9 
19th Board of Management Meeting (Offline) 
31.07.2026 
Friday 
10 
20th Board of Management Meeting (Online) 
18.09.2026 
Friday 
11 
21st Board of Management Meeting (Online) 
13.11.2026 
Friday 
12 
22nd Board of Management Meeting (Online) 
08.01.2027 
Friday 
13 
23rd Board of Management Meeting (Online) 
19.03.2027 
Friday 
14 
24th Board of Management Meeting (Online) 
28.05.2027 
Friday 
    15 
21st Governing Body Meeting 
07.08.2026 
Friday 
    16 
22nd Governing Body Meeting 
20.11.2026 
Friday 
    17 
23rd Governing Body Meeting 
22.01.2027 
Friday

Page 17 of 17 
 
   18 
24th Governing Body Meeting 
16.04.2027 
Friday 
   19 
10th IQAC Meeting 
12.08.2026 
Wednesday 
   20 
11th IQAC Meeting 
18.11.2026 
Wednesday 
   21 
12th IQAC Meeting 
20.01.2027 
Wednesday', 16, 'Academic Calendar AY2026-27.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 1: 1. Purpose', '| Title | Student Code of Conduct | Document ID | SRM-DSDH-2026-PLCY-001 |
| :--- | :--- | :--- | :--- |
| **Hierarchy Level** | L4 – University Policy | **Status** | Approved |
| **Policy Owner** | Directorate of Student Discipline and Hostel | **Effective Date** | 17.08.2026 |
| **Version** | 1.0 | **Next Review Date** | 16.08.2029 |

### 1. Purpose

SRM University–AP maintains an academic environment dedicated to learning, intellectual development, and holistic growth. Students are afforded reasonable freedom and flexibility, which are inseparably accompanied by corresponding duties of responsibility, discipline, and accountability. Such freedom may, where necessary, be subject to guidance, regulation, and intervention by the University to ensure the orderly conduct of academic and community life.

Students are expected to internalize and uphold the core values of the University, including integrity, mutual respect, trust, compassion, and service to society. The University seeks to provide a distinctive educational experience that enables students to develop problem-solving abilities, effective communication skills, and the capacity to contribute positively to the University community and the society at large.

The purpose of this **Student Code of Conduct Policy** (Code) is to establish standards of behavior, define responsibilities, and provide clarity regarding acceptable conduct within SRM University–AP, with the objective of maintaining a safe, orderly, and healthy environment conducive to inclusive growth. Any conduct, whether occurring on or off university premises, that undermines or interferes with these objectives shall constitute a violation of this Code.

### 2. Scope and Applicability

This Code shall apply to **all students duly registered** with SRM University–AP, as defined in definitions at Para 3.1. Every student is required to conduct himself or herself in a manner consistent with the standards prescribed herein in all activities, including academic, residential, administrative, co-curricular, and extra-curricular engagements, and in all interactions with fellow students, University authorities, staff, external organizations, and the public.

The provisions of this Code shall govern student conduct **both within and outside the University premises**, where such conduct arises in the course of university-related activities, where the student represents or purports to represent the University, or where the student is otherwise identifiable as a student of SRM

---
1', 1, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 2: University-AP and such conduct has a bearing on the discipline, safety, reput...', 'University-AP and such conduct has a bearing on the discipline, safety, reputation, or orderly functioning of the University.

This Code applies to all academic and community engagement activities as specified herein. Students shall, always, comply with all general, academic, financial, and administrative policies, regulations, statutes, and rules of the University, including the General Academic Regulations and General Student Rules, as amended from time to time.

At the time of admission into the University / institution, every student is informed about the code of conduct policy of the University. Students are hence aware of the policies and code of conduct of the University and shall strictly adhere and uphold the same.

**Lack of knowledge or awareness of such policies and regulations shall not be accepted as justification, defense, or ground for exemption from compliance or disciplinary action.**

### 3. Key Definitions

For the purposes of this Student Code of Conduct, unless the context otherwise requires, the following expressions shall have the meanings assigned to them hereunder: -

* **3.1 “Student”** means any person duly registered, whether on a full-time or part-time basis, with SRM University-AP, and shall include students participating in any academic, co-curricular, extra-curricular, exchange, or mobility programme with a partner university or any other educational institution, as well as casual or visiting students, where such participation is under the academic supervision, instruction, or guidance of the University faculty or staff.

* **3.2 “SRMAP”** means SRM University, Andhra Pradesh.

* **3.3 “Warden”** means a hostel warden appointed or employed by SRM University-AP and entrusted with the supervision, administration, and discipline of university hostels.

* **3.4 “Workmen”** means personnel engaged in maintenance, housekeeping, or allied services, whether employed directly by the University or engaged on a contractual, outsourced, deputed, or temporary basis.

* **3.5 “Parents”** means the biological mother and father of the student and shall also include a legally recognized or locally appointed guardian preferably appointed by the parents, as applicable.

---
2', 2, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 3: 3.6 **“Controlled Substances”** means drugs, medicines, or substances regulat...', '3.6 **“Controlled Substances”** means drugs, medicines, or substances regulated under applicable law, including those capable of causing physical or psychological dependence/ addiction

   **“Illicit Substances”** or **“Illicit Drugs”** means any plant, substance, or preparation, whether of natural or synthetic origin, which produces psychotropic effects and is prohibited or restricted under applicable state or central laws, and which may adversely affect the physical or mental health of an individual.

3.7 **“Day Scholar”** or **“Day Boarder”** means a student who is enrolled at the University but does not reside in university hostels and commutes to the campus for academic or related activities.

3.8 **“University Officials”** means persons acting in an official capacity on behalf of the University, or persons who have been duly vested with authority and responsibility by the competent University authority, and shall include, but not be limited to, the Vice- Chancellor, officers, faculty members, administrative staff, and any other authorized personnel.

3.9 **“Ragging”** shall, unless the context otherwise requires, mean any act, conduct, or practice, whether individual or collective, by which the dominant power or status of senior students is exercised over students newly admitted or otherwise considered junior or subordinate, or vice versa and shall include all acts or practices recognized as ragging under applicable laws, statutes, and University Grants Commission (UGC) Regulations.

3.10 **“Disciplinary Committee”** means the committee constituted by the competent authority, including the Vice-Chancellor, for the purpose of maintaining discipline within the University, and which shall be empowered to receive complaints, conduct inquiries, investigate allegations, and adjudicate upon matters relating to student misconduct in accordance with these Regulations.

**Words and expressions used but not defined in these Regulations shall have the meanings assigned to them under the applicable Acts, Statutes, Ordinances, Regulations, and rules governing the University.**

### 4. Disciplinary Authorities and their Powers

**4.1** All powers relating to the maintenance and enforcement of discipline among students, and the initiation and imposition of disciplinary action against students at the University and its Schools, Departments, Constituent Units, and Centers, shall vest in the Vice-Chancellor.', 3, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 4: 4.2 The Vice-Chancellor may delegate any or all such disciplinary powers, as ...', '4.2 The Vice-Chancellor may delegate any or all such disciplinary powers, as he deems appropriate, to such officers or authorities of the University as may be specified by him for this purpose.

4.3 The Heads of Schools, Departments, Constituent Units, or Centers shall have the authority to exercise such disciplinary powers over students within their respective jurisdictions as may be delegated or assigned to them under these Regulations.

### 5. General Guidelines

**Students are required to read, understand, and strictly comply with the following Guidelines, Rules, and Regulations:**

* **5.1** Every student duly enrolled at SRM University-AP shall, at all times, remain subject to the disciplinary control and jurisdiction of the University and its respective Schools, Departments, and constituent units.

* **5.2** Every student at the University shall be subject to and shall strictly adhere to the disciplinary framework of the University and comply with all rules, regulations, and disciplinary policies in force within and outside the university premises.

* **5.3** All rules and regulations of SRM University-AP shall be applicable to students in both **online and offline modes**, and violations in either mode shall attract disciplinary action.

* **5.4** Any act of non-compliance with the rules and regulations of the University shall render the student liable to disciplinary action in accordance with the applicable policies by the competent authorities.

* **5.5** At the time of admission, every student shall be required to execute a declaration affirming that, upon admission, he or she voluntarily submits to the disciplinary jurisdiction of the Vice-Chancellor and such other authorities of the University, Schools, or Departments as may be vested with disciplinary powers under the applicable Acts, Statutes, Ordinances, Regulations, rules, and guidelines framed by the University from time to time.

* **5.6** All Schools and Departments of the University shall be duty-bound to implement and comply with all instructions and directions issued under these Regulations and shall extend full cooperation and assistance to the Vice-Chancellor to ensure their effective enforcement.

* **5.7** The Heads of Schools and Departments, Deans of Faculties, Directors and Librarians shall exercise such authority over students within their

---
4', 4, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 5: respective Schools, Departments, or institutions as may be necessary for the ...', 'respective Schools, Departments, or institutions as may be necessary for the orderly administration and proper conduct thereof. Such authorities may exercise their powers directly or delegate the same to designated faculty members, subject to the approval of the Vice- Chancellor.

**5.8** The University campus is declared a **Smoke-Free, Alcohol-Free, and Drug-Free Zone.** In accordance with the laws of the State of Andhra Pradesh and other applicable laws, the possession, consumption, or use of intoxicants, drugs, alcohol, or prohibited substances is unlawful and strictly prohibited within and outside the university premises and premises operated by the university. SRM University–AP follows a policy of **zero tolerance** toward such substances or materials.

**5.8.1.** The use, possession, consumption, distribution, sale, or peddling of tobacco products, alcohol, illegal drugs, smoking materials, **“Illicit Substances”** or **“Illicit Drugs** or any controlled or prohibited substances, as well as being under the influence of such substances within the University campus or hostel premises or premises operated by the university, is strictly prohibited.

**5.8.2.** Tobacco products in any form are strictly prohibited within the University campus.

**5.8.3.** If any prohibited substance or material as specified above is found in a hostel room or in the possession of a student anywhere within the campus or premises operated by the University, strict disciplinary action shall be initiated against the concerned student(s) or room occupant(s), in accordance with the University’s disciplinary policy, where involvement in consumption, possession, or peddling is established.

**5.8.4. Right of Inspection & Search.** Security personnel, Vigilance officer and wardens or any person duly appointed by the university are authorized to conduct frisking, inspection of baggage, and breath analysis using appropriate devices where there is reasonable suspicion of alcohol consumption or possession of prohibited substances, in accordance with law.

**5.8.5.** Notwithstanding the foregoing, possession and use of medicines prescribed by a registered medical practitioner for legitimate medical treatment shall be permitted. A copy of such prescription given by a registered medical practitioner shall be maintained by the student and will be subjected for verification/ cross- verification, if

---
5', 5, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 6: necessary. Such evidence or prescription may be used by the University to tak...', 'necessary. Such evidence or prescription may be used by the University to take any disciplinary action against the student in accordance with the University’s disciplinary policy.

**5.8.6.** In cases involving substance abuse, including narcotic drugs, psychotropic substances, controlled substances, or any substance declared controlled under applicable law, the University Disciplinary Committee shall be empowered **to impose expulsion at the first instance**, subject to due process.

**5.8.7.** Permitting or facilitating the entry of day boarders into hostel rooms with the intent of using, consuming, or distributing illicit substances or prohibited materials, with or without the consent of the hostel occupant, shall be treated as peddling. Severe disciplinary action shall be initiated against both the day boarder(s) and the hostel resident(s) concerned.

**5.8.8.** The University authorities reserve the right to inform the parents or guardians of students found to have violated any of the above provisions.

**5.8.9.** Where required under applicable law, or in cases involving serious violations, the University may refer the matter to appropriate law enforcement authorities. The decision of the University Management in such cases shall be final and binding, subject to applicable law.

**5.9** Any form of sexual misconduct, harassment, or related misconduct shall be treated as a serious offense and dealt with in accordance with the University’s Policy on Sexual Harassment and applicable law.

**5.10** No individual or organization shall use the name, logo, seal, restricted images, trademarks, or other identifiers of SRM University–AP, or any mark suggesting association with the University or any of its Schools, Departments, or Centers, without prior written authorization from the competent University authority or as otherwise permitted under applicable trademark laws.

**5.11** The use of the official seal of the University on publications, manufactured articles, or any other material is strictly prohibited unless expressly authorized in writing by the University. Applications for such authorization shall be submitted to the Registrar of the University.

**5.12** Students shall conduct themselves in a manner befitting the academic

---
6', 6, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 7: environment of the University and shall maintain decorum in classrooms, libra...', 'environment of the University and shall maintain decorum in classrooms, libraries, and all other campus facilities. While no formal dress code is prescribed, students shall maintain attire and appearance consistent with the dignity and ethos of an educational institution.

**5.13** The use of mobile phones is prohibited in classrooms and libraries except with the prior permission of the faculty member or authority concerned. Sleeping in classrooms and libraries is also prohibited.

**5.14** Students shall exercise due care and responsibility in the use of university facilities and resources and shall refrain from any act resulting in wastage, misuse, or damage.

**5.15** Any act of vandalism, damage, or destruction of university property, including furniture, fixtures, equipment, or buildings, shall render the student(s) responsible liable to disciplinary action and to compensate the University for the loss or damage caused.

**5.16** Consumption or carrying of food items is prohibited in classrooms, libraries, auditoriums, laboratories, or any other venue where academic or official activities are being conducted.

---

### 6. THE FOLLOWING ACTIONS COMMITTED BY STUDENTS ARE CONSIDERED TO BE MISCONDUCT:

**6.1** Any act of misconduct committed by a student inside or outside the campus shall be an act of violation of discipline of the University, such as disruption of teaching, examination, research or administrative work, curricular or extra-curricular activity or

**6.2** residential life of the members of the University, including any attempt to prevent any member of the University or its staff from carrying on his or her work; or engaging in any act that is likely to cause such disruption;

**6.3** Engaging in any attempt of confinement of teachers, officers, employees and students at the University or camping inside or creating nuisances inside the boundaries of the houses of teachers, officers and other members of the University.

**6.4** Use of abusive and derogatory slogans or intimidatory language or incitement of hatred and violence or any act calculated to further the same.

**6.5** Committing forgery, impersonation, tampering with or misuse of the University documents or records, identification cards, etc.

---
7', 7, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 8: SRM UNIVERSITY AP', 'SRM UNIVERSITY AP
Andhra Pradesh

**6.6** Furnishing false certificate or false information to any office under the control and jurisdiction of the University.

**6.7** Indulging in acts of gambling, betting with or without money in the University premises

**6.8** Possessing or using any weapons such as knives, lathis, iron chains, iron rods, sticks, explosives and firearms in the University premises or using such weapons against any students, teachers or officials of the University inside and outside the campus.

**6.9** Arousing communal, caste or regional, linguistic feelings or creating disharmony among students.

**6.10** Tearing of pages, defacing, burning and destroying books of the University''s library.

**6.11** Improper rendering of accounts for money drawn from or through any office under the control and jurisdiction of the University.

**6.12** Any act of moral turpitude.

**6.13** Any offence under law.

**6.14** Committing any of the offences specified in the examination byelaws include offences of impersonation, malpractice such as copying through books or any electronic means.

**6.15** Violation of the University''s traffic byelaws as notified.

**6.16** This code of conduct policy is applicable even during tour or excursion

**6.17** Pasting of posters or distributing pamphlets, handbills, etc. are objectionable, including writing on walls and disfiguring buildings are considered as violation and would amount to misconduct.

**6.18** Meddling with any ITKM equipment''s viz. CCTV, Wi-Fi access devices, biometric, etc, and safety equipment viz. fire extinguishers, hydrants, smoke and heat detectors in any area of the campus are strictly prohibited. Damaging any property belonging to the University is strictly prohibited. Any violation of the above will lead to disciplinary action as per the university regulations.

**6.19** Permitting or facilitating the entry of a day boarder or outsider or any other member into the hostel room without the knowledge or consent of the competent authority shall be treated as misconduct and severe disciplinary

---
8', 8, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 9: action will be taken by the competent authority.', 'action will be taken by the competent authority.

**6.20** Any other act which may be considered by the Vice-Chancellor or the Disciplinary Committee to be an act of violation of discipline would be considered as a misconduct and disciplinary action will be initiated against such misconduct.

### 7. ID Card

University Identity Cards ("ID Cards") shall be issued to incoming students by the Directorate of Student Affairs or the Warden Office, as applicable, during the official check-in or admission process.

**7.1** Students shall always wear their valid University-issued ID Cards while on campus and shall produce the same upon demand by security personnel or any other duly authorized University official. Failure to produce the ID Card on demand, without satisfactory explanation upon inquiry, may be treated as an act of misconduct and shall attract appropriate disciplinary action.

**7.2** The possession, use, lending, borrowing, alteration, or misuse of an ID Card issued to another student is strictly prohibited. Any student found in violation of this provision shall be liable to disciplinary action in accordance with the University''s disciplinary policies.

**7.3** In the event of loss, theft, or damage of an ID Card, the concerned student shall immediately notify the Warden Office or the Directorate of Student Affairs to enable deactivation of the card and prevent misuse. A replacement ID Card shall be issued subject to verification and processing timelines, and the cost incurred for such replacement shall be borne by the student.

**7.4** Any student who comes across an unattended University ID Card within the campus shall promptly hand over the same to the Warden Office or any other designated University authority and shall not retain or use such ID Card under any circumstances.

**7.5** Students under suspension/ rustication will hand over their identity card at the Office of Director Student Affairs and collect it on rejoining.

**7.6** Upon withdrawal from the University or upon completion of the academic programme and during the Exit Clearance process, every student shall mandatorily surrender the issued ID Card to the Directorate of Student Affairs, or such other authority as may be designated by the University.

---
9', 9, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 10: 8. Day Boarders', '### 8. Day Boarders

**8.1** The class attendance timings for day boarder students shall be governed by the academic calendar and timetable issued by the Office of the Dean of Academic Affairs. Any extension beyond the prescribed timings for any specific academic or official purpose shall require prior approval from the concerned Head of Department or the Dean of the respective School, and such approval shall be duly intimated to the Directorate of Student Affairs.

**8.2** A Day boarder seeking access to the University campus during weekends, holidays, or vacation periods for the purpose of using the library shall be permitted entry only upon production of a valid University-issued identity card. Such access shall be strictly limited to the library premises, and day boarders shall not be permitted to enter hostels or access any facilities exclusively designated for hostel residents.

**8.3** Day boarder students shall strictly comply with the above provisions and shall not engage in any form of argument, discussion, or dispute with university authorities in relation to the enforcement of these regulations.

**8.4 Out pass During Studying hours**  
In case of any emergency circumstances, out pass should be obtained from their respective HOD to leave the college premises during working hours. Upon verification and confirmation by the parents/ Guardians, out pass shall contain the signature of the respective HOD. The out pass along with the approved letter should be submitted in the security gate during the time of leaving. In case the HOD is unavailable the student can obtain approval from their faculty mentor.

---

### 9. Transport

**9.1** Students availing University-provided transport for daily commutation shall ensure that they possess a valid transport identity card issued by the Transport Department upon payment of the prescribed annual bus subscription. Any unauthorized use of university transport, including the use of forged, expired, or previously issued identity cards for the purpose of obtaining transport services, shall constitute misconduct and shall render the student liable to disciplinary action and financial penalties, which may include recovery of the full semester bus charges.

**9.2** University buses shall operate strictly in accordance with the schedules notified by the Transport Department of the University. Delays caused due to a student''s failure to adhere to prescribed bus timings shall not be entertained and may attract disciplinary action. In such circumstances,

---
10', 10, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 11: students shall be required to make alternative conveyance arrangements at the...', 'students shall be required to make alternative conveyance arrangements at their own cost.

**9.3** Hostel residents and students commuting by personal means of transport shall not be permitted to avail University bus services, except with prior written approval of the competent authority for a specified purpose or in cases of emergency.

**9.4** Any act of indiscipline, misconduct, or inappropriate behaviour by a student towards fellow students, staff, or faculty while using University bus services shall attract disciplinary action in accordance with University''s regulations.

**9.5** Any student availing University transport services without payment of the prescribed annual subscription shall be liable to disciplinary action and imposition of financial penalties as determined by the competent authority.

### 10. Internships

**10.1** All applicants staying in hostels seeking permission to leave the campus for the purpose of undertaking internships shall be duly endorsed and approved by the respective Head of Department or Dean of the School concerned.

**10.2** International students shall be required to submit to the Directorate of Student Affairs through Directorate IR & HS a copy of their internship offer letter, travel documents, approvals from the Head of Department or Dean, and written parental consent for completion of formalities and documentation, including those required by the Foreigners Regional Office (FRRO). Parental consent through official email communication shall be mandatory.

**10.3** Indian students shall submit their applications for leaving the campus for internships to the Warden or competent authority along with the internship offer letter and approval from the Head of Department. Parental consent through email or telephonic confirmation shall be mandatory.

### 11. Social Media Usage – Code of Conduct/Communication

#### 11.1 Purpose
The University believes that social media is a powerful platform for learning, collaboration, innovation and community engagement. Students are encouraged to use digital platforms responsibly while respecting the dignity, privacy, intellectual property, security and reputation of the University and all members of its community.

---
11', 11, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 12: This Policy establishes standards governing the responsible use of social med...', 'This Policy establishes standards governing the responsible use of social media and digital communication by students, whether such activity occurs on-campus or off-campus, whenever such activity has a direct or indirect impact on the University, its stakeholders or its reputation.

This Policy applies to all students enrolled in the University, irrespective of the mode of study.

### 11.2 Scope
This policy applies to any & all communication through, but not limited to:

* Facebook
* Instagram
* X (formerly Twitter)
* LinkedIn
* YouTube
* Threads
* Snapchat
* WhatsApp
* Telegram
* Discord
* Reddit
* Quora
* Blogs and Websites
* Podcasts
* Online Forums
* Community Platforms
* AI-generated content platforms
* Live streaming platforms
* Any future digital platforms

The policy applies equally to

* Posts
* Stories
* Reels / Shorts
* Live videos/ Streaming
* Audio recordings
* Podcasts
* Comments or Replies
* Shares / Retweets
* Screenshots
* Memes
* GIFs
* AI-generated content / Edited videos
* Anonymous accounts
* Private groups
* Closed communities
* Direct Messages where unlawful circulation later impacts the University.

12', 12, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 13: **11.3 Official University Communication**', '**11.3 Official University Communication**

Only people specifically authorized by the University shall create, manage or publish content ''on behalf'' of the University. No student without written authority is permitted to publish any information about university or its related elements (including student or event alignments)

Student Clubs, Student Councils, Departments and Committees may operate official social media pages only after obtaining written approval from the competent authority within Directorate of Communications or Registrar.

No student shall represent themselves, in direct or indirect terms, as an official spokesperson of the University unless expressly authorized in writing.

All official communications, announcements, campaigns, promotional materials or institutional updates shall require prior approval from the designated authority before publication.

**11.4 Student Responsibilities**

Students are expected to
* uphold the dignity of the University;
* communicate truthfully and responsibly;
* verify facts before posting;
* respect privacy and confidentiality;
* exercise good judgement while creating or sharing online content;
* comply with applicable laws including the Information Technology Act, Bharatiya Nyaya Sanhita, Digital Personal Data Protection Act & other applicable laws.

Students should remember that content posted online remains permanently accessible and may continue to affect individuals and institutions long after publication.

Students should also be cognizant and evaluate if that the content, post verification will help build correct impression of the institute/ dept or individual and will/ should not be misconstrued by readers or any other external agencies.

**11.5 Good Digital Practices**

Students are encouraged to;
* promote positive achievements;
* celebrate academic excellence;
* verify information before sharing;

13', 13, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 14: * respect diversity;', '* respect diversity;
* engage constructively;
* protect personal information;
* report fake accounts impersonating the University;
* contribute to a respectful digital environment.

### 11.6 Prohibited Conduct

#### A. False or Misleading Content
Students shall not create, upload, circulate, forward or otherwise publish any content that:
* knowingly spreads false information;
* presents incomplete facts - which can deliberately or co-incidentally mislead viewers;
* selectively edits videos, images or audio to create a false impression;
* shares manipulated screenshots;
* circulates rumors or unverified allegations;
* inciting/ provoking messaging;
* targeted messaging
* intentionally misrepresents University policies, decisions or events.

#### B. Defamatory or Malicious Content
Students shall not publish content that
* defames the University;
* harms the reputation of faculty, staff, students, management or governing authorities;
* falsely accuses any individual/ department;
* makes malicious allegations;
* encourages online abuse or trolling.

#### C. Privacy Violations
Students shall not secretly record any individual, classrooms, labs, exam halls, counsellor sessions, disciplinary proceedings without explicit permission. No videos should be captured of student halls, hostel rooms or office premises without permission. No photographs, videos or recordings shall be made where a person has a reasonable expectation of privacy without explicit consent.

#### D. Unauthorized Campus Recording
Without prior written approval, students / guests shall not livestream campus incidents, disciplinary proceedings, any emergency situations. No non-authorized recording is permitted of any in or around campus

---
14', 14, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 15: SRM', 'SRM
UNIVERSITY AP
Andhra Pradesh

incidents like accidents, security operations, confidential research facilities or restricted infrastructure.

### E. Confidential Information
Students shall not disclose or publish any;
* internal circulars marked confidential;
* examination papers;
* evaluation processes;
* confidential meeting minutes;
* disciplinary proceedings;
* legal matters pertaining to university or related matters;
* personal information of students or staff;
* financial records;
* research data;
* intellectual property;
* unpublished academic material.

### F. Hate Speech and Harassment
Students shall not publish content that
* threatens individuals;
* bullies / harass others;
* humiliates persons;
* promotes hatred;
* blames or insinuates specific activities to an individual or dept;
* discriminates based on religion, caste, gender, language, nationality, disability or ethnicity;
* incites violence;
* encourages discrimination.

### G. Political or Ideological Misuse
Students shall not use the University''s name, logo, photographs, campus infrastructure or identity
* to endorse political organizations / campaigns for political parties;
* to mobilize protests by misrepresenting institutional facts;
* to falsely imply institutional endorsement of any ideology or movement non related to academic flow of institution without explicit permission from Registrar.

Nothing in this clause prevents students from exercising lawful personal political opinions in their individual capacity, provided they do not falsely or selectively represent the University''s position or misuse

<div style="text-align: center;">15</div>', 15, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 16: University identity.', 'University identity.

### H. Media Engagement
Students shall not invite media personnel to campus, organize press interactions, provide interviews on behalf of the University, circulate campus incidents to media organizations or issue official statements regarding University matters, without prior written approval.

### I. Impersonation
Students shall not
* create fake University accounts;
* impersonate faculty;
* impersonate staff;
* impersonate other students;
* Official stationery or imagery like (logo, seals, letterheads, email signatures with university name, visiting cards, etc.);
* impersonate University authorities.

### J. Artificial Intelligence Misuse
Students shall not create or circulate
* AI-generated fake speeches;
* deepfake videos;
* manipulated voices;
* fabricated documents;
* synthetic media falsely depicting University officials or events.
* Any image/ video/ audio posted even on personal accounts, using AI or editing tools, should be duly highlighted on content that is generated using AI/ edited for consumption.

### K. Intellectual Property
Students shall not publish or commercially exploit any of the following, without explicit permission in writing from registrar;
* copyrighted lectures;
* presentations;
* research work;
* software;
* institutional branding;
* examination material;
* teaching resources.

### 11.7 Responsible Expression
The University recognizes that students have the right to express opinions

16', 16, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 17: in their personal capacity.', 'in their personal capacity.  
Students are encouraged to
* distinguish personal opinions from institutional positions;
* use respectful language;
* seek clarification before assuming facts;
* use established grievance redressal mechanisms before making public allegations or commentary.

Where a student expresses a personal opinion concerning the University, they should ensure that it is factual, fair and does not falsely represent it as an official position of the University. Students should refrain from assuming facts based on hearsay & posting it online as facts or opinion, until verified by university officials.

### 11.8 Reporting Institutional Concerns
Students who experience academic concerns, harassment, discrimination, safety issues, administrative grievances, hostel or food concerns examination-related issues or any form of misconduct, are encouraged to first utilize the University''s formal grievance redressal mechanisms.

Public dissemination of incomplete, misleading or confidential information while bypassing available institutional mechanisms may invite disciplinary action where such conduct is found to be malicious, knowingly false or intended to cause reputational harm.

### 11.9 Student Ambassadors and Social Media Teams
Student champions authorized to support management official University pages shall;
* undergo orientation on social media ethics;
* publish only approved content;
* maintain confidentiality;
* protect account credentials;
* immediately report security breaches;
* comply with institutional branding guidelines.

### 11.10 Personal Accounts
Students remain personally responsible for content posted through their personal accounts where such content mentions, tags, or;
* identifies the University,
* references the University,
* depicts University premises,
* involves University personnel,

---
17', 17, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 18: * concerns University activities,', '* concerns University activities,
* has logo, Signia or imagery of university,
* affects the safety, dignity or reputation of members of the University community.

Students shall be held responsible, for not just posting such messaging themselves, but also sharing/ forwarding, tagging or liking such content as a creator, if found done with a malicious intent. Deleting content after publication shall not exempt a student from responsibility.

### 11.11 Digital Evidence
While examining allegations of misconduct, the University may rely upon
* screenshots,
* archived posts,
* deleted content recovered through lawful means,
* videos,
* electronic records,
* metadata,
* investigative data by verified agencies or authorized individuals,
* publicly available online content.

### 11.12 Monitoring and Investigation
The University reserves the right to investigate complaints concerning misuse of social media where there is reasonable evidence that such conduct
* violates this Policy,
* breaches University regulations,
* violates applicable law,
* threatens campus safety,
* harms institutional reputation,
* infringes privacy or intellectual property.
* Investigations shall follow the principles of natural justice, including providing the student with an opportunity to explain before any disciplinary decision is taken.

### 12. Unacceptable Communication with University Staff

**12.1** Students shall maintain **courteous, respectful, and professional communication** with all University officials, faculty members, staff, service providers, and representatives at all times.

**12.2** Any form of communication, whether **written, electronic, verbal, or digital**, including but not limited to **emails, text messages, instant messaging**

***

<div align="center">18</div>', 18, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 19: platforms, social media, or phone calls, that is impolite, discourteous, abus...', 'platforms, social media, or phone calls, that is impolite, discourteous, abusive, intimidating, threatening, coercive, defamatory, or insubordinate in nature shall be treated as misconduct.

**12.3** Such conduct includes, but is not limited to:
* Use of rude, offensive, or derogatory language
* Issuing threats (explicit or implied)
* Coercion, pressure tactics, or attempts to influence officials improperly
* Repeated or harassing messages after a response has been provided

Messages intended to intimidate, provoke, or undermine institutional authority

**12.4** Any student found guilty of the above shall be liable for disciplinary action in accordance with the University''s disciplinary procedures, which may include warning, apology, suspension of privileges, monetary penalty, suspension, or any other penalty deemed appropriate by the University authorities, depending on the severity and frequency of the misconduct.

### 13. General Do''s and Don''ts

**13.1** Any form of groupism, including fighting or unlawful conduct that disrupts campus harmony, is strictly prohibited.

**13.2** Students are encouraged to utilize their free time constructively in academic facilities such as libraries and laboratories, extra co-curricular activities and sports.

**13.3** Disorderly movement in verandas, congregations in front of offices, obstruction of campus roads, or sitting in unsafe or prohibited areas such as parapets, staircases, and footpaths is prohibited.

**13.4** The SRM University-AP campus shall be maintained as a smoke-free, alcohol-free, and drug-free environment. Possession, use, or consumption of tobacco, alcohol, or any intoxicating substances within the campus or hostels is strictly prohibited.

**13.5** Silence and decorum shall be maintained in libraries, classrooms, examination halls, laboratories, dining halls, and other public areas.

**13.6** Use of mobile phones in classrooms, libraries, and laboratories is prohibited unless expressly permitted by the competent authority. The possession and use of mobile phones and other electronic communication devices in examination halls is strictly forbidden.

**13.7** Students shall refrain from participating in any undesirable activity and shall always maintain the highest standards of discipline.

***

<div align="center">19</div>', 19, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 20: ![](https://srmuniversity.ac.in/wp-content/uploads/2020/05/SRM-Logo.png)', '![](https://srmuniversity.ac.in/wp-content/uploads/2020/05/SRM-Logo.png)

**13.8** Students shall not engage in anti-institutional, anti-national, antisocial, communal, immoral, or political expressions or activities within and outside the university campus or hostels.

**13.9** No student shall exert undue influence or coercion over fellow students.

**13.10** Politically affiliated students, organizations, or outfits are not permitted on campus. Students shall not organize, participate in, or attend activities sponsored by political organizations, including wearing politically symbolic attire or displaying slogans, accessories, or speeches.

**13.11** Students shall not deface, damage, destroy, or cause loss to any public, private, or University property, including but not limited to gym facilities, dining halls, classrooms, hostels, toilets, lifts, music rooms, sports equipment, and laboratory equipment. Students should properly switch off the AC, Fan, Lights, TV''s and other equipment when not in use.

**13.12** Unauthorized entry of outsiders into the campus or hostels is prohibited. Students shall not bring outsiders into university premises without prior permission from the competent authority.

**13.13** Distribution, circulation, or display of unauthorized notices, pamphlets, leaflets, or obscene material by any means within the campus or hostels is prohibited.

**13.14** Display of banners, flags, boards, or similar materials within campus premises, buildings, gates, or compound walls is prohibited without authorization.

**13.15** Collection of money by solicitation or coercion within the campus or hostels is prohibited.

**13.16** Any form of strike, procession, agitation, protest, gherao, blockade, or violent disturbance within or outside the University premises is prohibited.

**13.17** Gherao, unlawful confinement, or detention of any University official is strictly prohibited.

**13.18** Possession or use of weapons, explosives, or any object capable of causing injury or damage to life or property is prohibited.

**13.19** Rash, negligent, or reckless driving within university premises is prohibited. Use of personal vehicles without valid documents or protective gear, including triple riding on two-wheelers, is strictly prohibited.

**13.20** Students shall not enter or exit classrooms during sessions without prior permission of the faculty or competent authority.

**13.21** Students charged with criminal offenses or under suspension or expulsion shall not enter University premises without prior written permission of

<div style="text-align: center;">20</div>', 20, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 21: the competent authority.', 'the competent authority.

**13.22** Any criminal activity or breach of law and order within university premises shall be reported to the police authorities.

**13.23** Waste shall be disposed of only in designated bins provided across the campus, including classrooms, hostels, offices, canteens, and mess halls.

**13.24** Any conduct that brings disrepute or lowers the esteem of the University is prohibited and will result in strict disciplinary action.

**13.25** Students shall respect the rights and dignity of others in expressing opinions.

**13.26** Students shall refrain from inciting or provoking fellow students, colleagues, or the University administration.

**13.27** No Student should be involved in any illegal, immoral activity of any kind with or without using the Student ID issued by the university. If found suitable disciplinary actions will be taken against such students.

**13.28** If a student is found guilty or with any pending criminal proceedings against him/her in any courts or police station across India and outside India, then the university reserves the right to take appropriate action against students at any point of time including expulsion.

**13.29** Be informed that any indiscipline or misconduct will be recorded in the student ERP to trace history by the Directorate of Student Affairs.

**13.30** Respect the wellness, privacy and safety of others and abstain from unwanted behavior thereby not supporting, participating and committing any violation of this Code.

**13.31** Co-Operate and provide information at a disciplinary hearing

**13.32** Acknowledge that the decision of SRMAP is final and binding.

**13.33** Understand and acknowledge that sanctions as deemed essential will be imposed on violating any of the disciplinary policies.

**13.34** It is mandated to complete the sanctions (punishments) imposed by the university.

**13.35** Students should avoid disgraceful public display of affection (indecent position/ objectionable pose, etc) or any other inappropriate behavior with a fellow student or an outsider or a staff member, within or outside the university premises or premises maintained by the university. If found guilty, appropriate action will be taken by the university''s disciplinary committee.

**13.36** Students should maintain all their personal belongings, especially jewelry, and gadgets such as personal laptops, cell phones, money and other expensive materials with utmost care and caution. Management will

---
21', 21, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 22: not be held responsible in case of any theft or loss or damage to such items.', 'not be held responsible in case of any theft or loss or damage to such items.

**13.37** Entering or accessing female hostels by male students is strictly prohibited and vice versa.

**13.38** Parents are not allowed to enter the classroom, lab area, hostel rooms unless it is specifically allowed by the staff/warden or competent authority. Parents should meet the students in the appropriate common waiting area.

**13.39** Non-compliance with any of the above provisions shall attract strict disciplinary action.

### 14. RAGGING

Ragging, in any form, being illegal as declared by the Hon’ble Supreme Court of India and prohibited under applicable law, is strictly forbidden within the premises of the University, including its hostels, Schools, Departments, constituent units, Centres,

University transport systems, and any other area forming part of the SRM University- AP system.

Any individual or collective act, conduct, or practice amounting to ragging shall constitute gross indiscipline and shall be dealt with strictly under these Regulations and applicable law.

Acts or practices constituting ragging shall include, but shall not be limited to, the following:

**14.1** Conduct that subjects’ students to ridicule, contempt, humiliation, or adversely affects their self-esteem;

**14.2** Verbal abuse, aggression, indecent gestures, or obscene behavior; Physical assault or threat of use of physical force against any student;

**14.3** Abetment of ragging, whether by direct/ indirect participation, instigation, encouragement, facilitation, or any other form of support, which shall be deemed to constitute ragging;

**14.4** Any violation of this provision shall attract severe disciplinary action, including rustication or expulsion from the University, in addition to action under criminal law.

### 15. PROCEDURE FOR HANDLING CASES OF INDISCIPLINE OF STUDENTS

**15.1** The Head of a School, Department, Constituent Unit, or Centre, the authorities of the University hostels, and the security staff shall take immediate action upon receiving information regarding any incident of ragging, indiscipline, misbehaviour, or misconduct and shall promptly inform the Director of Student Affairs and the Chief Security Officer.

22', 22, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 23: **15.2** Notwithstanding the above, the Director of Student Affairs may, Suo ...', '**15.2** Notwithstanding the above, the Director of Student Affairs may, Suo moto, inquire into any incident of ragging, indiscipline, misconduct, or misbehaviour and submit a report to the Registrar or the Vice-Chancellor identifying the persons involved and describing the nature of the incident.

**15.3** The Director of Student Affairs may, where deemed necessary, communicate with the parents or guardians of the students concerned in matters requiring their assistance or intervention.

**15.4** Upon completion of the preliminary investigation, the Director of Student Affairs shall submit an initial report to the Student Discipline Committee/ Registrar or Vice-Chancellor establishing, prima facie, the identity of the perpetrators and detailing the nature of the ragging, gross indiscipline, misbehaviour, or misconduct.

**15.5** Where the Head of the School, Department, Institution, Constituent Unit, Centre, or the Director of Student Affairs is satisfied, for reasons to be recorded in writing, that it is not reasonably practicable to conduct a formal inquiry, appropriate recommendations may be made to the Registrar accordingly.

**15.6** The Director of Student Affairs shall assist the Registrar/ Vice-Chancellor in the exercise of disciplinary authority in respect of students at the University and its Schools, Departments, Constituent Units, and Centres.

**15.7** The Director of Student Affairs shall exercise such powers and perform such functions relating to student discipline as may be assigned by the Vice-Chancellor from time to time.

**15.8** Where the Vice-Chancellor is satisfied that it is not expedient to hold a formal inquiry, his decision shall be final and binding as an appellate authority. In other cases, he may refer/ revert the matter to the Student Disciplinary Committee constituted by him from time to time.

### 16. PENALTIES FOR BREACH OF DISCIPLINE

Without prejudice to the generality of the powers vested in him for the maintenance of discipline, the Vice-Chancellor, or such other competent authority including the Heads of Schools, Departments, Constituent Units, or Centres, may, in the exercise of such powers, order direct that any student:

**16.1** Be expelled from the School, Department, or University, as the case may be, in which event the student shall not be eligible for re-admission to the University or Institution from which he or she is expelled, provided that such expulsion shall not preclude admission to any other institution with the prior approval of the Chancellor; or

---
23', 23, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 24: **16.2** Be rusticated/ suspended for a specified period including the period...', '**16.2** Be rusticated/ suspended for a specified period including the period of pendency of disciplinary proceedings or criminal case against the students, during which the student shall not be admitted to the University or Institution until the expiry of the period of rustication; or

**16.3** Be denied admission, for a specified period, to a course or courses of study of the University; or

**16.4** Be imposed with a fine of such amount as may be specified by the competent authority; or

**16.5** Be debarred from appearing in one or more University examinations for a specified period.

**16.6** The Vice Chancellor may also, in exercise of the aforesaid powers or upon the recommendation of the Head of the concerned School, Department, or Institution, order for the cancellation or withholding of the result(s) of any examination(s) at which the student has appeared.

### 17. PENALTIES FOR RAGGING

**17.1** Upon receipt of a report or determination by the competent authority under these Regulations establishing the occurrence of ragging, the Vice-Chancellor or any authority empowered under these Regulations may order the expulsion of the student(s) involved for such period as may be specified. Students found to be involved in ragging shall also be proceeded against under the applicable criminal laws of India. Former students found guilty of ragging shall be rendered ineligible for admission to any Department of the University for a period of five years. All such actions shall be taken in compliance with the principles of natural justice.

**17.2** Where a student who has already been awarded a degree or diploma of the University is subsequently found guilty of ragging under these Regulations, appropriate action shall be taken in accordance with the provisions of the relevant Statutes and Regulations governing the conduct of examinations and award of degrees.

### 18. General Provisions – Disciplinary Process and Enforcement

#### 18.1 Reporting and Processing of Misconduct Cases

Misconduct falling under **Levels 1 and 2** shall be reported directly to the Directorate of Student Affairs (DSA) for further action. Based on the recommendations of the DSA, formal orders shall be issued by the Office of the Registrar.  
Misconduct of higher severity shall be forwarded to the University

---
24', 24, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 25: Discipline Committee through the Directorate of Student Affairs for necessary...', 'Discipline Committee through the Directorate of Student Affairs for necessary action.

### 18.2 Escalation in Case of Repetition

Repetition of any act of indiscipline, whether of the same nature or otherwise, shall result in action under the **next higher level** or any other appropriate level of the Policy, as deemed fit by the competent authority.

### 18.3 Strict Implementation and Right to Appeal

The provisions of this Policy shall be implemented strictly. Students are expected to refrain from any further act of indiscipline after imposition of a penalty.

However, students shall have the right to submit an appeal in their defense as per prescribed procedure.

These regulations are intended to ensure student safety, welfare, and professional development.

### 18.4 Compliance with Law of the Land

Where required by law, the University shall strictly comply with all legal mandates, including reporting or handing over students involved in offences relating to objectionable material, narcotics, prohibited substances, or similar violations to law enforcement agencies.

### 18.5 Academic Suspension and Carry Forward of Penalty

Academic suspension awarded for misconduct under **Levels 1 to 4** may be carried forward to the subsequent semester, particularly when misconduct occurs near or at the conclusion of an academic session.

### 18.6 Final-Year Students and Disciplinary Action

Final-year students involved in acts of indiscipline, including those occurring close to course completion, shall be subject to disciplinary penalties.

In such cases, **conduct certificates, degree processing, and examination results may be withheld** until completion of the punishment awarded by the inquiry committee.

---
25', 25, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 26: SRM UNIVERSITY AP', '### SRM UNIVERSITY AP
Andhra Pradesh

#### 18.8 Unlisted Misconduct

In cases of misconduct not expressly covered under this Policy, appropriate disciplinary action shall be determined by the competent authorities based on the nature and gravity of the offence.

#### 18.9 Applicability of Higher Severity Levels (Levels 5 and 6)

Levels 5 and 6 shall apply to serious offences including, but not limited to:

a. Ragging
b. Commercialization, distribution, or organized sale of drugs or smoking-related materials. Such cases may also attract action under applicable laws.

#### 18.10 Forwarding Cases for Issue of Orders

All disciplinary cases processed under various levels shall be forwarded by the Directorate of Student Affairs or the Discipline Committee to the Office of the Registrar, SRM University-AP, for issuance of formal orders.

#### 18.11 Withholding of Academic and Conduct Documents

For final-year students, conduct certificates, transcripts, and examination results may be withheld until completion of disciplinary punishment awarded by the inquiry committee.

---

### 19. PROCESS OF INITIATING DISCIPLINARY ACTION

#### Step 1:
Any/ All instances of student misconduct shall be reported to the Directorate of Student Affairs (DSA) for preliminary examination and action.

#### Step 2:
Where the alleged misconduct is assessed by the Directorate of Student Affairs as falling within Levels 1 or 2, the Directorate shall convene a meeting involving the student concerned, the Faculty Mentor assigned by the respective School and/or representatives of the concerned academic department. The parents or guardians of the students shall be duly informed. Upon completion of such proceedings, appropriate sanctions shall be imposed on the student(s) in accordance with the prescribed policy.

***

**26**', 26, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 27: **Step 3:**', '**Step 3:**

a. Where the alleged misconduct is assessed as falling within Levels 3 to 6, the Directorate of Student Affairs may convene a Fact-Finding Committee to ascertain the facts and enquire into the issue.

b. In case found blameworthy by the Fact-Finding Committee, a Show cause Notice shall be issued to students(s) with a copy to parents, to be replied by the students within three days.

c. In case the reply to Show cause, Notice is not found plausible /tenable / no reply is received within stipulated time, Director of Student Affairs shall convene a meeting of the Disciplinary Committee. The parents or guardians of the concerned student(s) shall be informed and may be required to participate. After deliberation, an appropriate decision will be taken by the Disciplinary Committee.

d. Upon conclusion of the proceedings, appropriate sanctions shall be imposed on the student(s) in accordance with this Policy. Repetition of any act of indiscipline shall attract penalties under the next higher or any other appropriate level of the Policy.

e. Defaulter(s) may be referred to the Wellness center for counselling.

f. An undertaking from the student and parents for not getting involved in any case of misconduct shall be submitted within seven days of the communicated decision. In case of any punishments imposed by the University, it shall be duly executed upon the student.

1. **APPEAL PROCESS**

   Students retain the right to appeal against disciplinary action under level 5 & 6 only in accordance with prescribed procedures.

   **Step 1**

   Where a student is aggrieved by the decision of the Directorate of Student Affairs or the Disciplinary Committee and the sanctions imposed there upon, the student may submit a written appeal to the Appeal Committee, SRM University-AP, within the prescribed time of seven (7) days, detailing specific grounds such as:

   (a) Procedural errors  
   (b) New evidence.  
   (c) Disproportionate penalty (ies)

---
27', 27, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 28: SRM UNIVERSITY AP', '# SRM UNIVERSITY AP
Andhra Pradesh

### Step 2

#### Step 2: Consideration of Appeal
Upon receipt of the appeal, the Appeal Committee shall examine whether the appeal satisfies the grounds specified in Step 1.

If the appeal is found to be admissible, the Appeal Committee shall provide the student with an opportunity of being heard and may, thereafter, pass any one or more of the following orders:

* Uphold the decision of the Directorate of Student Affairs / Disciplinary Committee.
* Remand the matter to the Disciplinary Committee for reconsideration with appropriate directions.
* Modify, mitigate, or enhance the penalty imposed, as deemed appropriate; or
* Constitute or refer the matter to an Appellate Committee for detailed adjudication, where necessary.

The decision of the Mercy Committee/ Appellate Committee or the outcome of the Mercy Appeal, as the case may be, shall be final and binding on all parties.

The final decision shall be formally communicated to the student by the Office of the Registrar.

### Step 3

If the student continues to remain aggrieved by the decision of the Appellate Committee, the student may submit a Mercy Appeal to the Hon''ble Vice-Chancellor.

### 2. REVIEW APPEALS

a. Any student aggrieved by a decision taken by Appeal Committee, under this Policy may prefer an appeal to the Vice-Chancellor seeking review of such decision within thirty (30) days from the date of communication of the decision. The student shall be afforded an opportunity of hearing, in strict compliance with the principles of natural justice.

b. Upon consideration of the appeal, if the Vice-Chancellor is satisfied that the matter warrants review, he may refer the appeal to the Appeal Committee / Student Disciplinary Committee for reconsideration. The decision of the Vice-Chancellor on such appeal shall be final and binding.

***

28', 28, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 29: PENALTIES FOR MISCONDUCT AND INDISCIPLINE', '# PENALTIES FOR MISCONDUCT AND INDISCIPLINE

Students are expected to follow these guidelines to conduct themselves as law-abiding citizens of India.

**A.** At the time of application and on admission, each student along with his/her parents is obliged to sign an affidavit confirming their consent to abide by this Code of Conduct.
**B.** Every student shall uphold this Code of Conduct and refrain from indulging in any form of misconduct that can affect the university''s interests and reputation.

| TYPE OF MISCONDUCT | CONSEQUENCE |
| :--- | :--- |
| **Level 1**<br><br>**A. Identity Card, Dress Code & General Discipline**<br>1. Loitering or moving within the University campus without wearing a valid identity card.<br>2. Failure to adhere to the prescribed dress code within the University campus.<br>3. Littering or causing pollution within the University campus.<br><br>**B. Classroom & Academic Environment Misconduct**<br>4. Use of a mobile phone during an ongoing class without prior consent of the faculty member.<br>5. Any act that disturbs or disrupts the teaching-learning process.<br>6. Any act that disrupts or interferes with the conduct of online classes.<br>7. Displaying impolite, rude, or disrespectful behavior within classrooms or elsewhere on the University campus.<br><br>**C. Hostel Conduct & Behavioral Violations** | **Consequences (Applicable to All Level 1 Misconduct, Based on Severity & Repetition)**<br>• Intimation to Parents<br>• Imposing Fine of **INR 5,000/- or INR 7,500/- or INR 10,000/-** depending on the gravity of the misconduct<br>• Imposing within **Three (03) days / Seven (07) days**, an **Academic Suspension and/or Social Service** (inside or outside campus), as decided by the competent authority |', 29, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 30: 30', '| | |
| :--- | :--- |
| 8. Celebrating birthdays within hostel premises or classrooms. | |
| 9. Disturbing fellow hostel residents during designated quiet hours by shouting, running, playing, keeping room lights on, or speaking loudly on mobile phones. | |
| 10. Playing cards within hostel premises or classrooms, including playing cricket/ football in hostel corridors. | |
| **D. <u>Misuse of Hostel Facilities & Services</u>** | |
| 11. Use of electrical appliances not authorized under the Hostel Manual (excluding laptops and mobile phones) without prior approval or causing disturbance through loud music or similar activities. | |
| 12. Any act of indiscipline within the Gymnasium or Dining Hall. | |
| 13. Removing mess utensils or mess food from the designated dining area to hostel rooms or any unauthorized location. | |
| 14. Assigning or directing hostel housekeepers, security personnel, or any other staff for personal use beyond the scope permitted under Hostel rules. | |
| **E. <u>Unauthorized Access & Presence (Higher Severity within Level-1)</u>** | |
| 15. Unauthorized entry into hostel premises or kitchen areas. | |
| 16. Presence of a non-resident student in a hostel room or availing meals in the hostel mess; disciplinary action shall be initiated against both the hosteller and the non-resident | |

30', 30, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 31: Section on Page 31', '| | |
| :--- | :--- |
| student.<br><br>**F. <u>Movement Violations & Out-Pass Non-Compliance (Most Severe under Level-1)</u>**<br>17. Leaving the hostel premises without obtaining a valid out-pass or reporting back beyond the permitted time specified in the out-pass.<br>18. Being outside the hostel premises beyond the permitted hours, constitutes a violation of University''s rules and regulations. | |
| **<u>Level - 2 : Misconduct and Consequences</u>**', 31, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 32: SRM UNIVERSITY AP', '# SRM UNIVERSITY AP
Andhra Pradesh

| | |
| :--- | :--- |
| decided by the University from time to time.<br><br>**D. Digital / Cyber Misconduct (Highest Severity within Level-2)**<br>5. Any act of cyberbullying, including harassment, intimidation, coercion,<br>6. or emotional harm caused through electronic or digital means.<br>weapons, sharp objects, pornographic material, or any prohibited physical or digital content (hard copies, CDs, or electronic storage). | |
| **LEVEL - 3 : Serious Misconduct and Consequences**<br><br>**A. Property Damage, Theft & Misuse of University Assets**<br>1. Willful breakage, defacement, damage, theft, misappropriation, unauthorized use, or misuse of University''s properties, including infrastructure, furniture, equipment, sports goods, hostels, canteen facilities, University buses, ITKM systems, and security or surveillance equipment.<br>2. Theft of cash or any other items belonging to the University, its students, staff, employees, or visitors, including laboratory equipment and safety/ security apparatus.<br><br>**B. Possession of Prohibited Substances or Items**<br>3. Possession, consumption, or transportation of any smoking product, nicotine- containing | **Consequences LEVEL - 3**<br>**(Applicable Based on Nature & Gravity of Misconduct)**<br><br>**For Points 1, 2, and 3**<br><ul><li>Parents to report to the University and sign an undertaking</li><li>Imposing within Seven (07) days, an Academic Suspension and Social Service (inside/ outside campus)</li><li>Recovery of ten (10) times the cost of damaged property + INR 10,000/- fine</li><li>Damage to common facilities to be recovered from the entire group/users</li><li>Imposing a Ban on short leaves and out-passes for one (01) month</li><li>Debarment from End-Semester Examination, if warranted</li></ul> |

***

32', 32, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 33: Section on Page 33', '| | SRM UNIVERSITY AP <br> Andhra Pradesh |
|---|---|
| substance, alcohol, or any other intoxicant within the University campus or hostel premises.<br>4. Possession of prohibited or banned items, including but not limited to firecrackers, weapons, sharp objects, pornographic material, or any prohibited physical or digital content (hard copies, CDs, or electronic storage).<br><br><u>**C. Violence, Threats & Serious Misconduct Against Persons**</u><br>5. Any act of physical assault, threat of use of physical force', 33, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 34: <br>', '| | |
| :--- | :--- |
| &nbsp;&nbsp;&nbsp;&nbsp;confrontations with university authorities or staff.<br>9. Participation in or organization of any agitation, public demonstration, slogan-raising, or collective disruptive activity — violent or otherwise — within or outside the University campus.<br>10. Indulging individually or collectively in any act that disrupts or obstructs the orderly conduct of classes, examinations, placements, academic work, or other authorised University activities, including mass bunking. | |
| **E. <u>Cyber, Digital Misconduct causing Emotional trauma</u>**<br>11. Causing emotional disturbance or trauma through electronic media, social media including unauthorized recording of conversations of students, faculty, or staff without consent, and misuse or circulation of such recordings.<br>12. Inciting students against fellow students or the University administration through verbal communication or electronic means such as WhatsApp messages, reels, videos, or other digital platforms.<br>13. Distribution, display, or publication of posters, notices, signs, audio-visual content, blogs, or webpages that are offensive, threatening, intimidating, illegal, or defamatory. | |
| **F. <u>Financial, Ethical & Commercial Misconduct</u>**<br>14. Any act of bribery or attempted bribery, including offering, giving, | |

<br>

<p align="center">34</p>', 34, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 35: soliciting, or accepting money, gifts, or undue advantage to influence offici...', 'soliciting, or accepting money, gifts, or undue advantage to influence official conduct.
15. Any form of betting, gambling, extortion, extraction of money, or unauthorized borrowing or lending of money among students.
16. Indulging in, facilitating, or promoting any business, commercial, or trading activity within the University campus, hostels, or University transport facilities without prior authorization.

### G. Non-Compliance, Defiance & Residual Misconduct

17. Failure to comply with punishments imposed under University''s disciplinary procedures, or any act amounting to contempt of, non-cooperation with, or obstruction of such procedures.
18. Breach of any undertaking or declaration given to the University, or refusal to comply with lawful directions issued by the HOD, Dean, Director (Student Affairs), Registrar, Chief Proctor, Vice- Chancellor, or other competent authority.
19. Organizing, attending, or participating in activities, events, or agitations sponsored by political or religion-based organizations, including use of specific dress, slogans, accessories, or speeches.
20. Any other act of commission or omission which, in the opinion of the Student Disciplinary Committee, constitutes serious indiscipline or breach of university rules and

***

<div style="text-align: center;">35</div>', 35, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 36: Section on Page 36', '| LEVEL - 4 : Grave Misconduct and Severe Penalties | Consequences (Applicable to All Level-4 Misconduct) |
| :--- | :--- |
| regulations. | |
| **A. Serious Public Misconduct & Reputational Harm**<br><br>1. Any complaint of major misconduct received from within or outside the University campus, including but not limited to cheating shopkeepers, creating nuisance in public places, or any act that brings disrepute to the University, its officials, staff, or students, or adversely affects its reputation, standing, or good name. | Depending on the nature, gravity, of the offence either on its own volition or through findings of the Disciplinary / Statutory Committee, one or more of the following penalties may be imposed:<br><br>1 Parents / Guardians shall be required to report to the University in person and sign an undertaking.<br>2 Imposing Rustication for one semester or one academic year, whichever is longer as deemed appropriate.<br>3 Debarment from appearing in semester-end examinations.<br>4 Debarment from placement drives and University placement assistance. |
| **B. Physical Violence Causing Serious Harm**<br><br>2. Engaging in physical fights resulting in serious injury, or acts committed with malicious intent, whether among students or involving any member of the University staff. | |
| **C. Gender-Based Harassment & Crimes Against Women**<br><br>3. Any act—verbal, written, visual, or electronic—that violates the dignity, modesty, or honour of women, including eve-teasing, molestation, accosting, making sexually suggestive or obscene gestures, using abusive language, or sending offensive emails, WhatsApp messages, MMS, or any other electronic communications to female students, faculty members, or staff. | The University reserves the right to initiate criminal or statutory proceedings wherever the misconduct attracts provisions under applicable laws, in addition to the', 36, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 37: ```', '```
                                                                SRM
                                                                UNIVERSITY AP
                                                                Andhra Pradesh
```

| | |
| :--- | :--- |
| 4. Any act that violates the status, dignity, or honour of students belonging to Scheduled Castes (SC) or Scheduled Tribes (ST), including use of abusive or derogatory language, humiliation, intimidation, or any activity intended to demean, ridicule, or tarnish their reputation, whether directly or indirectly.<br><br>**D. Discrimination, Harassment & Hate-Based Conduct**<br>5. Any behaviour that constitutes discrimination, harassment, or victimization on the basis of sex, sexual orientation, gender identity or reassignment, race, religion, disability, age, or any other protected characteristic, directed towards any student, staff member, employee, or visitor of the University | |
| **LEVEL - 5 : Extreme / Zero- Tolerance Misconduct**<br><br>**A. Substance Abuse, Intoxication & Illegal Materials**<br>1. Attending the University campus or classes in an inebriated condition, or possessing, consuming, or transporting alcohol in any form within university premises.<br>2. Possession, consumption, transportation, creation, distribution, or inducement of others to bring objectionable, dangerous, or illegal material into the University campus, including but not limited to non- prescribed or illegal drugs, cannabis/weed, | **Indicative Consequences : Level 5 (Zero-Tolerance Level)**<br><br>Any one or more of the following actions may be imposed, depending on the gravity of the offence and statutory requirements:<br><ul><li>Imposing Immediate suspension/ rustication pending inquiry, which may be extended till the completion of the inquiry to ensure fair inquiry</li><li>Expulsion from the University and permanent removal from rolls</li><li>Debarment from</li></ul> |

<div align="center">37</div>', 37, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 38: SRM UNIVERSITY AP', '# SRM UNIVERSITY AP
Andhra Pradesh

| | |
| :--- | :--- |
| hazardous or controlled substances, or any items prohibited under the NDPS Act or other State/National laws.<br><br>**B. Academic, Administrative & Identity Fraud**<br><br>3. Forgery of signatures of any University authority; submission of false or fabricated documents; providing false information related to hostel or academic matters; or creating, using, or possessing **fake, old, invalid, or duplicate identity cards, bus passes, or hall tickets.**<br>4. Any act of **fraud, impersonation, or deception**, including lending identity cards, providing or marking proxy attendance, impersonating another person, or using fraudulent credentials to obtain academic, hostel, transport, or financial benefits.<br><br>**C. Cybercrime, Data Tampering & System Abuse**<br><br>5. Tampering with, hacking, or gaining **unauthorized access** to the University''s **ERP/ITKM or IT systems** for personal gain, including alteration of marks, attendance, records, or unauthorized access to confidential or restricted information through cyber tools or digital means.<br><br>**D. Sexual Misconduct, Exploitation & Coercion** | examinations and placements<br>• Expulsion from hostel and withdrawal of all University facilities<br>• Reporting to law-enforcement agencies and initiation of criminal proceedings under applicable laws (IPC, IT Act, NDPS Act, etc.)<br><br>Parents/Guardians to be summoned and informed in writing Level-5 offences are non-compoundable within the University and may mandatorily require police or statutory reporting, irrespective of internal disciplinary action. |

<br>', 38, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 39: 6. Indecent exposure, cohabitation, or sexual acts in confined or unauthorize...', '6. Indecent exposure, cohabitation, or sexual acts in confined or unauthorized areas of the University campus, including but not limited to empty classrooms, laboratories, offices, fire exits, elevators, hostel rooms, or hostel mess facilities.
7. Engaging in **harmful, exploitative, or coercive behaviours** affecting the safety or well-being of others, including creating, possessing, or sharing private or obscene videos to **blackmail, threaten, or coerce** fellow students; pressuring others into pornography; maintaining connections with potential drug suppliers; or manipulating parents during admissions for personal or illegal gain.
8. Pendency of criminal cases or other legal repercussions such as police inquiry/ investigations against the students.

| LEVEL – 6 : Ultimate / Expulsion- Level Misconduct | Indicative Consequences: Level 6 (Mandatory & Discretionary) |
| :--- | :--- |
| **A. Recidivism of Serious Offences**<br>1. Repetition of any misconduct classified under LEVEL–3 or LEVEL–4, whether of a similar or different nature, shall constitute a serious and aggravated violation of University''s rules and regulations and shall attract stringent disciplinary action, including rustication or expulsion, as determined by the competent | Depending on the nature, gravity, of the offence either on its own volition or depending on the findings of the Disciplinary / Anti-Ragging Committee and statutory requirements, one or more of the following may be imposed:<br>• **Rustication for one or more semesters or** till completion of inquiry to ensure conduct of fair inquiry or to such time, as |

39', 39, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 40: **<u>IMPLEMENTATION</u>**', '| | |
|---|---|
| authority.<br><br>**B. <u>Management-Determined Grave Misconduct</u>**<br>2. Any act or omission committed by a student which, in the considered opinion of the University Management, warrants rustication or expulsion, shall be treated as a grave violation of University''s rules and regulations and shall be subject to disciplinary action deemed appropriate by the competent authority, notwithstanding its classification under any other level.<br><br>**C. <u>Ragging (Zero-Tolerance / Statutory Offence)</u>**<br>3. Engaging in ragging, in any form, as defined under the University Grants Commission (UGC) Regulations on Curbing the Menace of Ragging in Higher Educational Institutions, shall constitute a grave and non-compoundable offence and shall attract strict disciplinary action, including rustication or expulsion, in addition to action under applicable civil or criminal law | the University may think fit.<br>• **Expulsion from the University and permanent removal from rolls.**<br>• **Debarment from examinations, placements, and all University facilities.**<br>• **Cancellation of admission and forfeiture of fees**, as per university rules.<br>• **Mandatory reporting to statutory authorities / police**, where applicable<br>• Parents / Guardians to be summoned and informed formally.<br><br>Decisions under Level 6 shall be **final**, subject only to statutory appeal or judicial review, and shall override penalties prescribed under lower levels. |

### **<u>IMPLEMENTATION</u>**

* This Policy shall come into force with effect from the academic year 2025–26.
* The provisions of this Policy shall be enforced strictly and uniformly, without any relaxation or exception, except as expressly provided herein.

---
40', 40, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);
INSERT INTO public.campus_documents (document_slug, document_title, academic_year, category, section_heading, content, page_number, source_filename, is_published)
VALUES ('code-of-conduct', 'Student Code of Conduct', '2026-27', 'code_of_conduct', 'Page 41: ROLES & RESPONSIBILITIES (RACI MATRIX)', '### ROLES & RESPONSIBILITIES (RACI MATRIX)

| Task / Activity | Directorate of Student Affairs | Disciplinary Committee | Head of Dept. / Dean | Student & Parents |
| :--- | :--- | :--- | :--- | :--- |
| Report & preliminary examination of misconduct | A | I | C | I |
| Conduct formal inquiry (Levels 3-6) | C | A | C | C/I |
| Issue Show Cause Notice & final orders | R | A | I | I |
| Impose penalties as per matrix | R | A | I | R (Comply) |
| Conduct appeal hearing | I | C (if referred) | I | C |

*(R=Responsible, A=Accountable, C=Consulted, I=Informed)*

---

### AMENDMENTS

The University reserves the right to amend, modify, suspend, or repeal any provision of this Policy, in whole or in part, at any time, as deemed necessary by SRM University-AP, without prior notice. Any decision of the University in this regard shall be final and binding on the students.

**Authorized Signatory**

Registrar  
SRM UNIVERSITY-AP  
Andhra Pradesh-522 240.

---
41', 41, '01. Student Code of Conduct of SRM UNIVERSITY AP.pdf', true);