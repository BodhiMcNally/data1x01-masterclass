# Run from this extracted project folder in RStudio or with Rscript.
if (!requireNamespace("shiny",quietly=TRUE) || !requireNamespace("ggplot2",quietly=TRUE)) {
  stop('Install packages first: install.packages(c("shiny", "ggplot2"))')
}
shiny::runApp("shiny", host="127.0.0.1", launch.browser=interactive())
