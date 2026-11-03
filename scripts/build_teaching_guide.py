"""Build the printable instructor guide. Requires reportlab; no network access."""
from pathlib import Path
from xml.sax.saxutils import escape
import json,re
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

P=Path(__file__).resolve().parents[1]
pdfmetrics.registerFont(TTFont('Guide',str(P/'assets/DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('GuideBold',str(P/'assets/DejaVuSans-Bold.ttf')))
pdfmetrics.registerFontFamily('Guide',normal='Guide',bold='GuideBold',italic='Guide',boldItalic='GuideBold')
RED=colors.HexColor('#C52032');INK=colors.HexColor('#20242B');TEAL=colors.HexColor('#166478')
styles={
 'body':ParagraphStyle('body',fontName='Guide',fontSize=10.3,leading=15,textColor=INK,spaceAfter=9),
 'h1':ParagraphStyle('h1',fontName='GuideBold',fontSize=25,leading=30,textColor=INK,spaceAfter=17),
 'h2':ParagraphStyle('h2',fontName='GuideBold',fontSize=14,leading=19,textColor=RED,spaceBefore=11,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Guide',fontSize=10,leading=14,textColor=INK,spaceAfter=7),
 'eyebrow':ParagraphStyle('eyebrow',fontName='GuideBold',fontSize=9,leading=13,textColor=RED,spaceAfter=10),
 'cell':ParagraphStyle('cell',fontName='Guide',fontSize=9,leading=12,textColor=INK),
 'code':ParagraphStyle('code',fontName='Courier',fontSize=9.3,leading=13,textColor=INK,spaceAfter=10),
}
story=[]
def add(t,style='body'):story.append(Paragraph(t,styles[style]))
def head(title):
 if story:story.append(PageBreak())
 add('DATA1x01 / ANSWER GUIDE','eyebrow');add(title,'h1')

q=json.loads((P/'data/questions.json').read_text())
for start,end in [(0,4),(4,8),(8,13)]:
 head('Multiple-choice answers '+str(start+1)+'-'+str(end))
 for item in q[start:end]:
  add(str(item['number'])+'. '+item['title']+' ('+item['answer']+')','h2')
  for letter in 'ABCD':
   text=item['reasons'][letter]
   text=re.sub(r'\$([^$]+)\$',lambda m:m[1].replace(chr(92)+'sqrt n','sqrt(n)').replace(chr(92)+'sqrt{100}','sqrt(100)').replace(chr(92)+'times',' x '),text)
   add('<b>'+letter+(' - correct' if letter==item['answer'] else '')+':</b> '+escape(text),'small')
  if item['number']==3:add('Mean = 10 - 2 x 7 = -4; SD = 2 x 1.2 = 2.4; correlation = -0.4114.','small')
  if item['number']==4:add('The probability is 0.8185946141. The 68-95 rule gives approximately 0.815.','small')
  if item['number']==10:add('SE = (0.5 - 0)/2 = 0.25. New t = (0.5 - 0.75)/0.25 = -1, with 15 df. Two-sided p = 0.3331701.','small')
  if item['number']==12:add('E = 80 x 64 / 160 = 32; df = (2 - 1)(3 - 1) = 2. All expected counts are at least 20.','small')

head('Short answers 1 and 2')
add('1. Study limitations (4 marks)','h2')
add('Sleep was not randomly assigned. Workload or prior preparation could be associated with both sleep and quiz scores, so the fitted slope alone cannot establish a causal effect. The volunteers were reached at evening study spaces and may differ from other first-year students, so the result cannot automatically be generalised to all first-year students.')
add('<b>1 mark each:</b><br/>1. Identify the causal overstatement.<br/>2. Explain the lack of random allocation or a plausible confounder affecting both sleep and score.<br/>3. Identify the unsupported population generalisation.<br/>4. Link that limit to volunteers recruited at evening study spaces. Equivalent well-supported wording earns credit.','small')
add('2. P-value interpretation (4 marks)','h2')
add('If sleep group and caffeine category were independent, the probability of obtaining a chi-squared statistic of 16.543 or larger would be approximately 0.0002557, assuming the test conditions hold. Since p &lt; 0.05, reject the null of independence. The data provide evidence of an association. This does not establish causation.')
add('<b>1 mark each:</b><br/>1. Condition the probability on independence being true.<br/>2. Specify a chi-squared statistic of 16.543 or larger.<br/>3. Compare p with 0.05 and reject the null.<br/>4. State evidence of association between sleep group and caffeine category. The p-value does not give the probability of the null hypothesis.','small')
add('HATPC working','h2')
add('<b>H:</b> independence versus association. <b>A:</b> independent student records and adequate expected counts.<br/><b>T:</b> Expected rows are (20, 28, 32). Sum (O - E)²/E = 2 x (3.2 + 0.5714286 + 4.5) = 16.542857. df = 2.<br/><b>P:</b> Upper-tail area = 0.0002557197.<br/><b>C:</b> Reject at 5%, with evidence of association under the model assumptions. Recruitment still limits population generalisation.','small')

head('Short answer 3')
add('A question, a plot and code (5 marks)','h2')
add('<b>Question:</b> How does the association between sleep and quiz score vary across caffeine categories?')
add('ggplot(students,<br/>       aes(x = Sleep, y = Score,<br/>           colour = Caffeine, shape = Caffeine)) +<br/>  geom_point() +<br/>  labs(x = "Nightly Sleep (hours)",<br/>       y = "Practice Quiz Score (marks)")','code')
story.append(Image(str(P/'figures/three_variable_scatter.png'),width=500,height=290,kind='proportional'))
add('<b>1 mark each:</b><br/>1. A research question involving all three variables.<br/>2. A scatterplot with labelled Sleep and Score axes.<br/>3. A clear key for caffeine categories.<br/>4. Correct data frame and x/y mapping in ggplot().<br/>5. geom_point() with colour or shape mapped to Caffeine. A labelled schematic is sufficient. Equivalent coherent questions and graphical mappings earn credit.','small')
add('The displayed figure adds a presentation theme and an accessible colour/shape scale to the basic answer code. A multiple-regression or interaction test is not required.','small')

head('Course sources and revision')
add('Question alignment','h2')
for item in q:
 add('<b>Q'+str(item['number'])+':</b> '+escape(item['sources']),'small')
add('The short answers follow the criticism, p-value interpretation and graphical-code tasks in the official sample extended answer. These are original practice questions with suggested marks, not an official marking scheme.','small')
add('Official resources','h2')
add('Canvas course 74355: Topics 1-11, weekly challenges, revision quizzes, Week 13 revision workshop, Exam Guide and current sample papers. The written-source review was completed on 3 November 2026. Full source links and the question audit are in the project documentation.','small')
add('This revision reopened the current Canvas learning map, exam-preparation page, sample MCQ paper, extended-answer sample, Topic 8 lecture and Challenges 4, 6, 8 and 11. It also used the original complete written-source inventory. Recordings and separately linked interview transcripts were not reviewed. No separate official extended-answer marking rubric was linked.','small')
add('Try the weekly challenges independently, repeat the revision quizzes and complete the current sample under timed conditions. Keep an error log that explains the wrong choice and the reasoning to use next time. Revise the full core syllabus beyond this session.','small')
add('More resources: <link href="https://bodhimcnally.com/" color="#146C72">bodhimcnally.com</link>','h2')

head('Presentation and interactive examples')
add('Presenting and live voting','h2')
add('<b>Live votes:</b> Extract the complete project. Configure a permanent voting server with python scripts/deploy_live_questions.py, then open Start_Live_Questions.bat or run python scripts/launch_live_questions.py. Students scan the joining QR and can join mid-session without an app or account.','small')
add('Space/right arrow or A closes voting and reveals the explanations with A-D percentages. Q enlarges the joining QR. Late arrivals receive the current question. Revealed questions stay locked. Add --with-shiny to run the R widgets alongside polling.','small')
add('Local integration and 100 simultaneous voter connections passed. Public Cloudflare connectivity is unverified because this build environment blocks tunnels. Temporary links have no uptime guarantee and a 200 in-flight request limit. Use the Worker setup for the event and check joining from a phone.','small')
add('<b>Offline:</b> Open masterclass.html. The option selection, answer reveals, sample-size controls and null-value controls work without an internet connection. The final website and source links need internet access.','small')
add('<b>R Shiny:</b> Extract the complete project. Install shiny and ggplot2, then run source("launch_shiny.R") from the project folder in RStudio. The companion app opens the same presentation with live R plots embedded on the sample-size and paired-test slides. Rscript launch_shiny.R also works; open the localhost address printed in the console.','small')
add('The sampling widget calculates simulated sample means with R and overlays their theoretical Normal density. Changing the number of replicates smooths the approximation without changing theoretical SE. The paired widget reruns t.test(D, mu = selected value). The interval stays fixed while t and p change.','small')
add('Error log','h2')
add('The slide uses an original Notion-style mockup. The editable mockup HTML and an importable CSV template are in resources/. The example entries cover reversed conditioning, the sign of correlation after a negative transformation and using output from the wrong null hypothesis.','small')
add('MCQ advice sources','h2')
add('NBME (2024), Item-Writing Guide, pp. 12-13 and technical item flaws: the expected answer before the options and option-length cues. Kruger, Wirtz and Miller (2005), JPSP 88(5), 725-735, DOI 10.1037/0022-3514.88.5.725: the first-instinct fallacy. Butler and Roediger (2008), Memory & Cognition 36(3), 604-616, DOI 10.3758/MC.36.3.604: feedback after MCQ practice. The last-resort quotation is supplied by Bodhi and deliberately labelled facetious, without an invented attribution.','small')
add('Outcome mapping','h2')
add('LO1-LO10 follow the supplied wording and official DATA1001 S2 2026 outline. The blueprint gives the full mappings. SA3 practises the LO10 reporting component. Teamwork, oral presentation and interrogation require separate assessment.','small')

def page(canvas,doc):
 canvas.setStrokeColor(RED);canvas.setLineWidth(2);canvas.line(42,810,553,810)
 canvas.setFont('Guide',8);canvas.setFillColor(colors.HexColor('#59656E'))
 canvas.drawString(42,24,'Bodhi McNally | DATA1x01 revision | 10 November 2026')
 canvas.drawRightString(553,24,str(doc.page))
doc=SimpleDocTemplate(str(P/'Teaching_Guide.pdf'),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=48,bottomMargin=43,title='DATA1x01 Revision - Answer Guide',author='Bodhi McNally',pageCompression=1)
doc.build(story,onFirstPage=page,onLaterPages=page)
print(P/'Teaching_Guide.pdf')
