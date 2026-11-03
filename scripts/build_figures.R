# Recreate all presentation graphics with ggplot2. Run from the project root.
library(ggplot2)
students = read.csv("data/students.csv", stringsAsFactors = FALSE)
students$Caffeine = factor(students$Caffeine, levels = c("0", "1", "2+"))
students$SleepGroup = factor(students$SleepGroup, levels = c("Below 7 h", "At least 7 h"))
fit = lm(Score ~ Sleep, data = students)
students$Fitted = fitted(fit)
students$Residual = residuals(fit)
paper = "#FCFBF8"
ink = "#202830"
teal = "#146C72"
red = "#C62536"
palette = c("0" = teal, "1" = "#AA772E", "2+" = "#B63450")
revision_theme = theme_minimal(base_size = 17, base_family = "DejaVu Sans") +
  theme(panel.grid.minor = element_blank(),
        panel.grid.major.x = element_blank(),
        panel.grid.major.y = element_line(colour = "#E2E7E5", linewidth = 0.45),
        plot.background = element_rect(fill = paper, colour = NA),
        panel.background = element_rect(fill = paper, colour = NA),
        axis.title = element_text(colour = ink, size = 17),
        axis.text = element_text(colour = ink, size = 14),
        axis.title.x = element_text(margin = margin(t = 12)),
        axis.title.y = element_text(margin = margin(r = 12)),
        legend.position = "top",
        legend.title = element_text(size = 15),
        legend.text = element_text(size = 14),
        plot.margin = margin(15, 22, 15, 15),
        strip.text = element_text(face = "bold", colour = ink, size = 17),
        plot.title = element_text(face = "bold", size = 20, colour = ink))
theme_set(revision_theme)
save_plot = function(plot, name, width, height) {
  dir.create("figures", showWarnings = FALSE)
  target = paste0("figures/", name, ".png")
  temporary = paste0(target, ".tmp.png")
  png(temporary, width = width, height = height,
      units = "in", res = 180, type = "cairo", bg = paper)
  print(plot)
  dev.off()
  if (.Platform$OS.type == "windows" && file.exists(target)) unlink(target)
  stopifnot(file.rename(temporary, target))
}

p = ggplot(students, aes(Sleep)) +
  geom_histogram(binwidth = 0.5, boundary = 3, fill = teal,
                 colour = paper, linewidth = 1.2) +
  geom_vline(xintercept = 7, colour = red, linetype = "dashed", linewidth = 0.9) +
  annotate("text", x = 8.65, y = 22, label = "Mean 7.0 h\nSD 1.2 h",
           family = "DejaVu Sans", size = 5.5, colour = ink, hjust = 0.5) +
  scale_x_continuous(breaks = 4:10, limits = c(3.5, 10.5)) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.12))) +
  labs(x = "Nightly Sleep (hours)", y = "Students")
save_plot(p, "sleep_histogram", 8.1, 5.2)

normal = data.frame(x = seq(3, 11, length.out = 1000))
normal$density = dnorm(normal$x, mean = 7, sd = 1.2)
shade = subset(normal, x >= 5.8 & x <= 9.4)
p = ggplot(normal, aes(x, density)) +
  geom_area(data = shade, fill = "#BFDCD8") +
  geom_line(colour = teal, linewidth = 1.2) +
  geom_segment(data = data.frame(x = c(5.8, 9.4)),
               aes(x = x, xend = x, y = 0, yend = dnorm(x, 7, 1.2)),
               inherit.aes = FALSE, colour = red, linewidth = 0.8, linetype = "dashed") +
  scale_x_continuous(breaks = c(3.4, 5.8, 7, 9.4, 10.6)) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.08))) +
  labs(x = "Nightly Sleep (hours)", y = "Density")
save_plot(p, "normal_interval", 8.0, 4.6)

p = ggplot(students, aes(Fitted, Residual)) +
  geom_hline(yintercept = 0, colour = "#879294", linewidth = 0.6) +
  geom_point(shape = 21, fill = teal, colour = paper, stroke = 0.35,
             size = 3.0, alpha = 0.82) +
  labs(x = "Fitted Quiz Score (marks)", y = "Residual (marks)")
save_plot(p, "regression_residuals", 8.0, 4.0)

set.seed(10012027)
x = seq(48, 82, length.out = 150)
comparison = rbind(
  data.frame(Fitted = x, Residual = rnorm(150, 0, 5),
             Pattern = "Homoscedastic: roughly constant spread"),
  data.frame(Fitted = x, Residual = rnorm(150, 0, seq(1.7, 10, length.out = 150)),
             Pattern = "Heteroscedastic: changing spread"))
comparison$Pattern = factor(comparison$Pattern, levels = unique(comparison$Pattern))
p = ggplot(comparison, aes(Fitted, Residual)) +
  geom_hline(yintercept = 0, colour = "#879294", linewidth = 0.6) +
  geom_point(colour = teal, size = 2.1, alpha = 0.75) +
  facet_wrap(~ Pattern, nrow = 1) +
  labs(x = "Fitted Value", y = "Residual") +
  theme(panel.spacing = grid::unit(1.8, "lines"), strip.text = element_text(size = 15.5))
save_plot(p, "variance_comparison", 13.3, 4.1)

p = ggplot(students, aes(Sleep, Score, colour = Caffeine, shape = Caffeine)) +
  geom_point(size = 3.0, alpha = 0.82, stroke = 0.6) +
  scale_colour_manual(values = palette) +
  scale_shape_manual(values = c("0" = 16, "1" = 15, "2+" = 17)) +
  labs(x = "Nightly Sleep (hours)", y = "Practice Quiz Score (marks)",
       colour = "Caffeine (drinks/day)", shape = "Caffeine (drinks/day)") +
  guides(colour = guide_legend(override.aes = list(alpha = 1, size = 3.8)))
save_plot(p, "three_variable_scatter", 10.0, 5.8)

# Save actual console output used to check the question wording and rounding.
sink("docs/R_validation.txt")
cat(R.version.string, "\n\nggplot2:", as.character(packageVersion("ggplot2")), "\n")
cat("\nQ3: transformed summaries\n")
SleepIndex = 10 - 2 * students$Sleep
print(c(mean = mean(SleepIndex), sd = sd(SleepIndex),
        correlation = cor(SleepIndex, students$Score)))
stopifnot(abs(mean(SleepIndex) + 4) < 1e-9,
          abs(sd(SleepIndex) - 2.4) < 1e-9,
          abs(cor(SleepIndex, students$Score) + 0.41144204873964463) < 1e-9)
cat("\nQ4: all R expressions\n")
print(c(A = pnorm(9.4,7,1.2^2)-pnorm(5.8,7,1.2^2),
        B = pnorm(5.8,7,1.2)-pnorm(9.4,7,1.2),
        C = 1-pnorm(9.4,7,1.2)+pnorm(5.8,7,1.2),
        D = pnorm(9.4,7,1.2)-pnorm(5.8,7,1.2)))
followup = read.csv("data/phone_free_followup.csv")
D = followup$After - followup$Before
cat("\nQ10: original null\n"); print(t.test(D, mu = 0))
cat("\nQ10: changed null\n"); print(t.test(D, mu = 0.75))
stopifnot(abs(t.test(D, mu = 0.75)$p.value - 0.3331701359154764) < 1e-9)
tab = table(factor(students$SleepGroup, levels = c("Below 7 h", "At least 7 h")),
             students$Caffeine)
cat("\nQ12 and SA2\n"); print(tab); print(chisq.test(tab)); print(chisq.test(tab)$expected)
stopifnot(chisq.test(tab)$expected[1,3] == 32,
          abs(chisq.test(tab)$p.value - 0.0002557197163138959) < 1e-9)
cat("\nQ11\n"); print(summary(fit))
stopifnot(abs(coef(fit)[2] - 3) < 1e-9,
          abs(summary(fit)$coefficients[2,4] - 6.484985951891347e-8) < 1e-12)
cat("\nSA3 example code\n")
example = ggplot(students, aes(x = Sleep, y = Score,
                              colour = Caffeine, shape = Caffeine)) +
  geom_point() + labs(x = "Nightly Sleep (hours)",
                     y = "Practice Quiz Score (marks)")
stopifnot(nrow(ggplot_build(example)$data[[1]]) == 160)
cat("Code executed with 160 observations and three caffeine groups.\n")
cat("\nQ5 measurement error\n")
print(c(bias=20,SE=12/sqrt(36)))
stopifnot(12/sqrt(36)==2)
cat("\nQ7 binomial R options\n")
probs=c(A=1-pbinom(1,5,.4),B=1-pbinom(2,5,.4),C=dbinom(2,5,.4),D=pbinom(2,5,.4))
print(probs)
stopifnot(abs(probs[1]-.66304)<1e-10, all(abs(probs[-1]-probs[1])>1e-6))
cat("\nQ9 bootstrap code\n")
set.seed(1001)
boot_means=replicate(10000, {x=sample(students$Sleep,160,replace=TRUE);mean(x)})
stopifnot(length(boot_means)==10000,sd(boot_means)>0)
no_replace=replicate(30,mean(sample(students$Sleep,160,replace=FALSE)))
stopifnot(max(abs(no_replace-mean(students$Sleep)))<1e-10)
print(c(bootstrapMean=mean(boot_means),bootstrapSE=sd(boot_means)))
cat("\nQ13 goodness of fit\n")
gof=chisq.test(c(40,56,64),p=rep(1/3,3))
print(gof)
stopifnot(abs(unname(gof$statistic)-5.6)<1e-10,abs(gof$p.value-.060810062625218)<1e-10)
cat("\nInteractive CI additional null 1.25\n")
print(t.test(D,mu=1.25))
cat("All assertions passed.\n")
sink()
cat("Five ggplot2 figures saved. All R checks passed.\n")
