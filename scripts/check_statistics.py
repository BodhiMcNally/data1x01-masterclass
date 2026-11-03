"""Check the answer quantities from CSV with independent formulas and quadrature."""
from pathlib import Path
import json,math,csv,statistics
from scipy.integrate import quad
ROOT=Path(__file__).resolve().parents[1]
r=json.loads((ROOT/'data/results.json').read_text())
rows=list(csv.DictReader((ROOT/'data/students.csv').open()))
paired=list(csv.DictReader((ROOT/'data/phone_free_followup.csv').open()))
sleep=[float(x['Sleep']) for x in rows];score=[float(x['Score']) for x in rows]
d=[float(x['After'])-float(x['Before']) for x in paired]
checks={}
def check(name,actual,expected,tol=1e-9):
    assert abs(actual-expected)<tol,(name,actual,expected)
    checks[name]={'value':actual,'expected':expected,'passed':True}
check('sample sleep mean',statistics.mean(sleep),7)
check('sample sleep SD',statistics.stdev(sleep),1.2)
phi=lambda z:.5*(1+math.erf(z/math.sqrt(2)))
check('Normal interval using erf',phi(2)-phi(-1),r['normal_area'])
area=quad(lambda x:math.exp(-.5*((x-7)/1.2)**2)/(1.2*math.sqrt(2*math.pi)),5.8,9.4)[0]
check('Normal interval by quadrature',area,r['normal_area'])
check('Normal outside tails',1-phi(2)+phi(-1),1-r['normal_area'])
tab=[[sum(x['SleepGroup']==g and x['Caffeine']==c for x in rows) for c in ['0','1','2+']]
     for g in ['Below 7 h','At least 7 h']]
assert tab==r['chi_square']['observed']
check('conditional 2+ given short',tab[0][2]/sum(tab[0]),.55)
expect=[[sum(tab[i])*sum(t[j] for t in tab)/160 for j in range(3)] for i in range(2)]
chi=sum((tab[i][j]-expect[i][j])**2/expect[i][j] for i in range(2) for j in range(3))
check('independence expected count',expect[0][2],32)
check('independence chi-square',chi,r['chi_square']['statistic'])
check('chi-square df2 analytic upper tail',math.exp(-chi/2),r['chi_square']['p'])
check('paired difference mean',statistics.mean(d),.5)
check('paired difference SD',statistics.stdev(d),1)
check('paired SE',statistics.stdev(d)/math.sqrt(len(d)),.25)
def tpdf(x,df):return math.gamma((df+1)/2)/(math.sqrt(df*math.pi)*math.gamma(df/2))*(1+x*x/df)**(-(df+1)/2)
check('paired original two-sided p by integration',2*quad(lambda x:tpdf(x,15),2,math.inf)[0],r['paired']['p0'])
check('paired changed-null p by integration',2*quad(lambda x:tpdf(x,15),1,math.inf)[0],r['paired']['p75'])
for endpoint in r['paired']['ci95']:
    check('CI endpoint tail '+str(endpoint),quad(lambda x:tpdf(x,15),abs((endpoint-.5)/.25),math.inf)[0],.025)
xbar=statistics.mean(sleep);ybar=statistics.mean(score)
sxx=sum((x-xbar)**2 for x in sleep)
sxy=sum((x-xbar)*(y-ybar) for x,y in zip(sleep,score))
b1=sxy/sxx;b0=ybar-b1*xbar
check('regression slope by sums',b1,3)
check('regression intercept by sums',b0,49)
err=[y-b0-b1*x for x,y in zip(sleep,score)]
check('regression residual standard error',math.sqrt(sum(e*e for e in err)/158),8)
check('regression slope SE',8/math.sqrt(sxx),r['regression']['se'][1])
index=[10-2*x for x in sleep]
check('SleepIndex mean',statistics.mean(index),-4)
check('SleepIndex SD',statistics.stdev(index),2.4)
check('SleepIndex correlation',statistics.correlation(index,score),-r['regression']['r'])
check('mean SE n=25',1.2/math.sqrt(25),.24)
check('mean SE n=100',1.2/math.sqrt(100),.12)
check('mean SE n=400',1.2/math.sqrt(400),.06)
assert len(set(x['StudentID'] for x in rows))==160
assert len(set(x['StudentID'] for x in paired))==16
assert set(x['StudentID'] for x in paired)<=set(x['StudentID'] for x in rows)
assert all(0<=x<=100 for x in score)
check('measurement mean SE',12/math.sqrt(36),2)
bin_tail=sum(math.comb(5,k)*.4**k*.6**(5-k) for k in range(2,6))
check('binomial at least two by enumeration',bin_tail,.66304)
coltot=[sum(t[j] for t in tab) for j in range(3)]
gof=sum((v-160/3)**2/(160/3) for v in coltot)
check('goodness-of-fit chi-square',gof,5.6)
check('goodness-of-fit df2 analytic p',math.exp(-gof/2),.060810062625218)
check('CI widget null 1.25 p by quadrature',2*quad(lambda x:tpdf(x,15),3,math.inf)[0],.00897273747722333,1e-8)
(ROOT/'docs/statistical-checks.json').write_text(json.dumps({'checks':checks,'passed':len(checks)},indent=2))
print(f'{len(checks)} independent numerical checks passed; table counts, IDs and score bounds also verified.')
