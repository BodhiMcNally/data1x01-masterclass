"""Recreate the original teaching data, calculations and figures. No network calls."""
from pathlib import Path
import json, platform, sys
import numpy as np
import pandas as pd
import scipy
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
DATA, FIG = ROOT/'data', ROOT/'figures'
DATA.mkdir(exist_ok=True); FIG.mkdir(exist_ok=True)
SEED = 10012026
rng = np.random.default_rng(SEED)
n = 160
# Deliberately balanced quantiles give a credible Normal-shaped teaching sample.
# Rescaling fixes the mean and sample SD, without claiming random population sampling.
sleep = stats.norm.ppf((np.arange(n)+.5)/n)
sleep = 7 + 1.2 * (sleep-sleep.mean()) / sleep.std(ddof=1)
sleep = rng.permutation(sleep)
caffeine = np.empty(n, dtype=object)
for indices, counts in [(np.where(sleep<7)[0], [12,24,44]),
                        (np.where(sleep>=7)[0], [28,32,20])]:
    caffeine[rng.permutation(indices)] = np.repeat(['0','1','2+'], counts)
late = rng.random(n) < np.clip(.52-.18*(sleep-7), .1, .9)
# Heteroscedastic errors are intentional: a small nominal slope p-value cannot
# certify model assumptions. Remove projections to fix the fitted slope at 3.
sigma = 2.4 + 3.0*(sleep-sleep.min())
error = rng.normal(size=n)*sigma
X = np.column_stack([np.ones(n),sleep])
error -= X @ np.linalg.lstsq(X,error,rcond=None)[0]
error *= 8/np.sqrt(error@error/(n-2))
score = 49 + 3*sleep + error
commute = np.clip(rng.lognormal(np.log(32),.55,n),5,125)
df = pd.DataFrame({'StudentID':np.arange(1,n+1), 'Sleep':sleep,
    'Score':score, 'Caffeine':caffeine, 'StudyAfter10':np.where(late,'Yes','No'),
    'Commute':commute, 'SleepGroup':np.where(sleep<7,'Below 7 h','At least 7 h')})
df.to_csv(DATA/'students.csv',index=False,float_format='%.12f')

# A follow-up within the same story, on 16 different people measured twice.
eligible=np.where((sleep>5.5)&(sleep<8))[0]
idx=rng.choice(eligible,16,replace=False)
d=stats.norm.ppf((np.arange(16)+.5)/16)
d=.5+(d-d.mean())/d.std(ddof=1)
d=rng.permutation(d)
paired=pd.DataFrame({'StudentID':df.StudentID.iloc[idx].to_numpy(),
    'Before':sleep[idx], 'After':sleep[idx]+d, 'D':d})
paired.to_csv(DATA/'phone_free_followup.csv',index=False,float_format='%.12f')

observed=np.array([[12,24,44],[28,32,20]])
chi,pchi,dfchi,expected=stats.chi2_contingency(observed,correction=False)
se_d=d.std(ddof=1)/4
t0=d.mean()/se_d
p0=2*stats.t.sf(abs(t0),15)
ci=np.array([d.mean()-stats.t.ppf(.975,15)*se_d,
             d.mean()+stats.t.ppf(.975,15)*se_d])
t75=(d.mean()-.75)/se_d
p75=2*stats.t.sf(abs(t75),15)
b=np.linalg.lstsq(X,score,rcond=None)[0]
resid=score-X@b
rse=np.sqrt(resid@resid/(n-2))
se_b=np.sqrt(np.diag(np.linalg.inv(X.T@X))*rse**2)
t_b=b/se_b
p_b=2*stats.t.sf(abs(t_b),n-2)
r=np.corrcoef(sleep,score)[0,1]
results={'seed':SEED,'n':n,'sleep_mean':sleep.mean(),'sleep_sd_sample':sleep.std(ddof=1),
 'sleep_min':sleep.min(),'sleep_max':sleep.max(),'score_min':score.min(),'score_max':score.max(),
 'normal_area':stats.norm.cdf(9.4,7,1.2)-stats.norm.cdf(5.8,7,1.2),
 'conditional_caffeine_given_short':44/80, 'conditional_short_given_caffeine':44/64,
 'joint':44/160,'marginal_caffeine':64/160,
 'box_n25_ev':7.,'box_n25_se':1.2/5,'box_n100_ev':7.,'box_n100_se':1.2/10,
 'paired':{'n':16,'mean':d.mean(),'sd':d.std(ddof=1),'se':se_d,'t0':t0,'df':15,
 'p0':p0,'ci95':ci.tolist(),'t75':t75,'p75':p75},
 'regression':{'intercept':b[0],'slope':b[1],'se':se_b.tolist(),'t':t_b.tolist(),
 'p':p_b.tolist(),'rse':rse,'df':158,'r':r,'r2':r*r},
 'chi_square':{'observed':observed.tolist(),'expected':expected.tolist(),
 'contributions':((observed-expected)**2/expected).tolist(),'statistic':chi,'df':int(dfchi),'p':pchi},
 'sleep_index':{'mean':float((10-2*sleep).mean()),'sd':float((10-2*sleep).std(ddof=1)),'correlation':float(np.corrcoef(10-2*sleep,score)[0,1])}}
(DATA/'results.json').write_text(json.dumps(results,indent=2))

versions={'Python':platform.python_version(),'NumPy':np.__version__,'pandas':pd.__version__,'SciPy':scipy.__version__,'seed':SEED}
(ROOT/'VERSIONS.json').write_text(json.dumps(versions,indent=2))
print('Data and answer quantities regenerated.')
