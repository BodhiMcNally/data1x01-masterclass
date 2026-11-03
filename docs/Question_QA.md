# Question audit

Reviewed 3 November 2026 against the current Canvas course and the earlier complete written-source inventory. These are original questions using simulated data. The four-option format, code interpretation and data-story tasks follow the current practice papers. Suggested short-answer marks are local practice rubrics.

The fresh review reopened the learning map, exam-preparation page, current MCQ sample including the updated Q10 and key, extended-answer sample, Topic 4 measurement-error pages 38–45, Topic 8 bootstrap pages 48–52 and Challenges 4, 6, 8 and 11. No quizzes were submitted and no unpublished final exam was used.

Each MCQ has one best answer and four explanations revealed together beside the options. Correct/incorrect labels accompany the colours. The source and learning outcome remain visible before and after the reveal. An option click records a local selection only.

| Question | Answer | Course topics | Outcome | Calculator-free task |
|---|---|---|---|---|
| Q1 Study design | C | 1, 8 | LO2 / LO9 | Identify observational design and recruitment limits |
| Q2 Linking student records | D | 1 | LO1 | Choose an appropriate response to new linkage risks |
| Q3 Transforming variables | A | 3, 5 | LO3 / LO5 | Apply integer arithmetic and reverse a sign |
| Q4 Normal probabilities in R | D | 4 | LO4 | Identify an R probability expression |
| Q5 Measurement error | C | 4, 7 | LO4 / LO6 | Use sqrt(36)=6 and retain the bias |
| Q6 Conditional probability | B | 6 | LO6 | Choose the correct denominator, with fractions provided |
| Q7 Binomial probability in R | A | 6 | LO6 | Identify a Binomial tail expression |
| Q8 Sampling distributions | D | 7 | LO6 | Recognise quadruple n gives half SE |
| Q9 Bootstrapping the mean | B | 8 | LO6 | Distinguish resample size, replacement and replicate count |
| Q10 Using a confidence interval | B | 8, 10 | LO7 / LO8 | Compare the new null value with supplied CI |
| Q11 Linear regression | A | 5, 11 | LO5 / LO7 / LO9 | Read a residual plot and assess inference |
| Q12 Choosing the chi-squared test | C | 11 | LO7 | Compute 80 x 64 / 160 = 32 and df=2 |
| Q13 Goodness of fit | D | 11 | LO7 / LO8 | Compare the supplied p-value with 0.05 |

## Q1: Study design

**Tested skill:** LO2 / LO9.

An evening study-space QR invitation recruits 160 first-year volunteers. They report their sleep and complete a common quiz. **Which statement is most appropriate?**

- **A:** A larger sample would remove the recruitment bias. More observations reduce chance variation, not systematic selection bias.
- **B:** Volunteering makes the study a randomised experiment. Random allocation of a treatment defines a randomised experiment.
- **C (correct):** The study can identify associations, subject to recruitment limits. Sleep is observed. Selection bias and confounding remain possible.
- **D:** Using the same quiz makes the sample representative. A common measurement does not change how students were recruited.

**Source alignment:** Topic 1 pp. 25–38; Topic 8 pp. 12–22; Challenge 1 and 8; sample MCQ Q2, Q14; sample EA part (a).

## Q2: Linking student records

**Tested skill:** LO1.

A researcher wants to link the sleep survey to individual university marks. The original consent covered only the survey. **Which action is most appropriate before linking the records?**

- **A:** Remove names, then link records without checking consent. Removing names alone does not resolve consent or re-identification risks.
- **B:** Publish the linked records after replacing student numbers. Replacing an identifier does not necessarily make linked records anonymous.
- **C:** Assume a larger dataset makes privacy concerns negligible. More data can increase the risk of identifying an individual.
- **D (correct):** Check consent and ethics requirements, then limit and secure the data. Check the new use, minimise the linked data and protect access.

**Source alignment:** Module 1, Topic 1: ethics and data linkage; current sample MCQ Q1. LO1.

## Q3: Transforming variables

**Tested skill:** LO3 / LO5.

The following summaries describe the 160 students. A new variable is defined in R. **What are its mean, SD and correlation with Score?**

- **A (correct):** Mean −4, SD 2.4, correlation −0.4114. 10 − 2×7 = −4. SD is multiplied by 2 and correlation changes sign.
- **B:** Mean −4, SD 1.2, correlation −0.4114. Multiplication by −2 doubles the SD.
- **C:** Mean −4, SD 2.4, correlation +0.4114. Reversing the direction of Sleep changes the correlation’s sign.
- **D:** Mean +4, SD 2.4, correlation −0.4114. The transformed mean is 10 − 14 = −4.

**Source alignment:** Topics 3 and 5; Challenges 3.3 and 5.3; Exam Guide transformations; sample MCQ Q4.

## Q4: Normal probabilities in R

**Tested skill:** LO4.

Assume $X\sim N(7,1.2^2)$ models nightly sleep. **Which R expression calculates $P(5.8<X<9.4)$?**

- **A:** `pnorm(9.4,7,1.2^2)-pnorm(5.8,7,1.2^2)` The third argument of pnorm is the SD, not the variance.
- **B:** `pnorm(5.8,7,1.2)-pnorm(9.4,7,1.2)` The subtraction is reversed, giving a negative number.
- **C:** `1-pnorm(9.4,7,1.2)+pnorm(5.8,7,1.2)` This adds the two tails outside the required interval.
- **D (correct):** `pnorm(9.4,7,1.2)-pnorm(5.8,7,1.2)` Subtract the lower-tail area at 5.8 from the area at 9.4.

**Source alignment:** Topic 4 pp. 10–25; Challenge 4; Revision Quiz 4 Q18/Q25/Q26; sample MCQ Q6.

## Q5: Measurement error

**Tested skill:** LO4 / LO6.

A tracker measures the **same fixed duration** 36 times under the same conditions. Each reading has a bias of +20 minutes and an independent chance error with mean 0 and SD 12 minutes. **For the average of the 36 readings, what are the bias and SE?**

- **A:** Bias 0 minutes, SE 2 minutes. Averaging reduces chance error. The common +20 minute bias remains.
- **B:** Bias +20 minutes, SE 12 minutes. The spread of the average is smaller than the spread of one reading.
- **C (correct):** Bias +20 minutes, SE 2 minutes. Bias remains +20. The SE is 12 / sqrt(36) = 2 minutes.
- **D:** Bias +20/36 minutes, SE 12/36 minutes. The fixed bias remains. SE is divided by sqrt(36), not 36.

**Source alignment:** Module 2, Topic 4: measurement error; Module 3, Topic 7: SE of a mean; current sample MCQ Q7. LO4 and LO6.

## Q6: Conditional probability

**Tested skill:** LO6.

R gives the following counts. One student is chosen at random **from those sleeping below 7 hours**. What is the probability they report 2+ caffeinated drinks per day?

- **A:** 44/64 This conditions on 2+ drinks rather than short sleep.
- **B (correct):** 44/80 The relevant group contains 80 students, of whom 44 report 2+ drinks.
- **C:** 44/160 This is the joint probability among all 160 students.
- **D:** 64/160 This is the marginal probability of 2+ drinks.

**Source alignment:** Topic 6 conditional probability; Challenge 6 prosecutor fallacy; Revision Quiz 6 Q1/Q7/Q8; Week 13 recap p24.

## Q7: Binomial probability in R

**Tested skill:** LO6.

A box model has a 0.4 chance of a 2+ drinks ticket. Five tickets are drawn independently with replacement. Let X count the 2+ tickets. **Which R expression gives the chance of at least two?**

- **A (correct):** `1 - pbinom(1, 5, 0.4)` At least two is the complement of zero or one.
- **B:** `1 - pbinom(2, 5, 0.4)` This gives more than two, so it excludes X = 2.
- **C:** `dbinom(2, 5, 0.4)` This gives exactly two.
- **D:** `pbinom(2, 5, 0.4)` This gives at most two.

**Source alignment:** Module 3, Topic 6: Binomial model and pbinom; Challenge 6; current sample MCQ Q12 and Exam Guide. LO6.

## Q8: Sampling distributions

**Tested skill:** LO6.

A population has mean sleep **7 hours** and SD **1.2 hours**. Independent observations are sampled with replacement. **What are the EV and SE of the sample mean when n increases from 25 to 100?**

- **A:** EV 7 hours, SE 0.06 hours. SE scales with $1/\sqrt n$, not $1/n$.
- **B:** EV 7 hours, SE 0.48 hours. A larger sample reduces the SE.
- **C:** EV 28 hours, SE 0.12 hours. The EV of a sample mean remains the population mean.
- **D (correct):** EV 7 hours, SE 0.12 hours. $SE=1.2/\sqrt{100}=0.12$. Four times n gives half the SE.

**Source alignment:** Topic 7 pp. 26–32,45,55; Challenge 7 and 8; Revision Quiz 7 Q6/Q10; Week 13 workshop Report 2 Q2.

## Q9: Bootstrapping the mean

**Tested skill:** LO6.

The observed survey has 160 complete Sleep values. We want a bootstrap distribution of the mean. **Which expression should replace RESAMPLE?**

- **A:** `sample(students$Sleep, 160, replace=FALSE)` Without replacement, every value appears once. Each mean is unchanged.
- **B (correct):** `sample(students$Sleep, 160, replace=TRUE)` Each bootstrap sample has the original size and resamples the observed values with replacement.
- **C:** `rnorm(160, mean=7, sd=1.2)` This simulates from a Normal model rather than resampling the observed data.
- **D:** `sample(students$Sleep, 10000, replace=TRUE)` 10,000 is the number of replicates. Each resample should still contain 160 values.

**Source alignment:** Module 3, Topic 8: bootstrapping procedure, lecture pp. 48–52. LO6.

## Q10: Using a confidence interval

**Tested skill:** LO7 / LO8.

Sixteen students are measured before and after a phone-free fortnight. Let $D=\text{After}-\text{Before}$. Assume independent students and approximately Normal differences. **For the new two-sided test $H_0:\mu_D=0.75$ at 5%, which conclusion is correct?**

- **A:** Reject: the sample mean differs from 0.75. A sample estimate can differ from the null through chance variation.
- **B (correct):** Retain: 0.75 lies inside the 95% confidence interval. A matching two-sided 5% test retains null values inside the 95% CI.
- **C:** Retain: the new p-value is 0.06395. The printed p-value tests μD = 0. The new p-value is 0.3332.
- **D:** Accept: there is a 95% probability the mean lies in this interval. The parameter is fixed. 95% refers to the CI method’s long-run coverage.

**Source alignment:** Topic 10; Revision Quiz 10 Q1; sample MCQ Q17; Week 13 workshop Report 2 whiteboard task.

## Q11: Linear regression

**Tested skill:** LO5 / LO7 / LO9.

A regression of Score on Sleep gives the following output and residual plot. **Which statement is most appropriate?**

- **A (correct):** The changing residual spread raises concern about the usual slope inference. Increasing spread suggests heteroscedasticity. The usual test needs caution.
- **B:** The small p-value establishes constant residual variance. The slope test does not check the constant-variance condition.
- **C:** The positive slope shows that more sleep caused higher scores. Sleep was observed. Confounding remains possible.
- **D:** A straight residual QQ plot would establish all model assumptions. A QQ plot checks Normality, not every LINE condition.

**Source alignment:** Topic 5 pp. 39–50; Topic 11 pp. 47–53; Challenge 5 residual audit; sample MCQ Q8/Q10/Q20.

## Q12: Choosing the chi-squared test

**Tested skill:** LO7.

We want to test whether **sleep group and caffeine category are associated**. Which row gives the test, expected count for **Below 7 h / 2+ drinks** and degrees of freedom?

- **A:** Goodness of fit, expected 53.33, df = 2. Equal-proportion GOF concerns one variable, not the association of two.
- **B:** Independence, expected 44, df = 2. 44 is observed. Expected counts are calculated under independence.
- **C (correct):** Independence, expected 32, df = 2. $E=80\times64/160=32$ and $df=(2-1)(3-1)=2$.
- **D:** Independence, expected 32, df = 5. $rc-1$ is not the df formula for an independence test.

**Source alignment:** Topic 11 pp. 6–7,23–32; Challenge 11; Revision Quiz 11 Q8/Q11/Q19; sample EA Source 3.

## Q13: Goodness of fit

**Tested skill:** LO7 / LO8.

A model assigns equal population proportions to the three caffeine categories. Assume independent records and adequate expected counts. **What does this output support at the 5% level?**

- **A:** Reject, because the three observed counts differ. Unequal counts can arise through chance even when the model holds.
- **B:** Retain, which establishes equal population proportions. Retaining a model does not prove it.
- **C:** The probability that the equal-proportions model is true is 0.06081. The p-value assumes the null model. It does not give its probability.
- **D (correct):** Retain, with insufficient evidence against equal population proportions. p > 0.05, so the data do not provide sufficient evidence against the model at this level.

**Source alignment:** Module 4, Topic 11: chi-squared goodness of fit; Challenge 11; current sample MCQ Q18, Q29–30. LO7 and LO8.

## Short answers

SA1 (4 marks, LO2/LO9): 1 for identifying causal overstatement, 1 for lack of allocation or a plausible common cause, 1 for unsupported generalisation and 1 for connecting that limit to evening volunteers.

SA2 (4 marks, LO7/LO8): 1 for conditioning on independence, 1 for chi-squared 16.543 or larger, 1 for p < .05 plus rejection and 1 for evidence of association between the named variables. Expected counts, chi-squared calculation and df are supplied as supporting working, rather than extra marked requirements.

SA3 (5 marks, LO3 and LO10 reporting component): 1 for a question with all three variables, 1 for a scatterplot with labelled quantitative axes, 1 for a caffeine key, 1 for correct data/x/y mapping and 1 for geom_point plus caffeine mapped to colour or shape. A labelled schematic is enough. Equivalent coherent questions and mappings receive credit. This task does not by itself assess LO10 teamwork, oral presentation or interrogation.

The practice extended answer uses report criticism, p-value correction, graphical R code and a three-variable question. These tasks combine those demands in the sleep story without reproducing its question text. No official detailed marking scheme was linked on the current preparation page.

## Accuracy decisions

- The volunteer study permits associations. It supplies neither random allocation nor population sampling.
- Negative scaling changes the sign of correlation. SD uses the absolute multiplier.
- Normal notation contains variance, while pnorm requires SD.
- Measurement averaging reduces chance-error SE under the stated independence conditions. It leaves the common fixed bias.
- The Binomial model states fixed n, constant p and independence. At least two includes two.
- A bootstrap resample uses observed values, original sample size and replacement. It cannot repair convenience-sample bias.
- The changed-null question supplies a matching two-sided 95% interval. The old p-value cannot be reused for the new null.
- A small slope p-value does not check homoscedasticity or establish causality.
- Independence and goodness of fit answer different questions. Retaining either null does not prove it.
- No calculator-dependent p-values, quantiles or square roots are required. Fractions or output suffice.

## MCQ learning advice

NBME's 2024 guide supports answering a focused stem before examining the options and avoiding technical cues. Kruger, Wirtz and Miller (2005) challenge the rule that a first answer should never be changed. Butler and Roediger (2008) support corrective feedback after MCQ practice. Application to this statistics revision session is an instructional adaptation, not a claim that these studies directly evaluated DATA1001 students.

The long-option quotation is provided by the user and clearly marked facetious. No attribution to its author has been invented. Its spelling is preserved verbatim. The subsequent explanation treats option length as an unreliable cue.

## Live Questions integration

The 13 polls use the same answer order and correct options as the audited questions above. A source comparison confirms that the original academic wording, answers, explanations and footnotes are unchanged. The added phone prompts remove TeX/Markdown syntax and refer to the presentation where its code, table or plot is needed. Counts and percentages are hidden until the answer reveal. Space/right arrow or A locks voting and reveals the existing four explanations. Revealed questions remain locked on a return visit. Late arrivals receive the current live question.

The actual integration checks cover answer changes, same-browser refresh, answer locking, reconnects, offline answer reveals resynchronising on reconnect, QR decoding, a late join at Q2, 100 independent voting connections and simultaneous Shiny operation. Public Cloudflare tunnelling is blocked by the build environment's outbound network, so the public connection is an explicit verification limit.
