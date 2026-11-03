# Companion presenter app. Every widget is calculated by R Shiny.
library(shiny)
library(ggplot2)
project_dir = normalizePath("..")
addResourcePath("deck", project_dir)
followup = read.csv(file.path(project_dir, "data", "phone_free_followup.csv"))
D = followup$After - followup$Before
paper = "#FCFBF8"
ink = "#202830"
teal = "#146C72"
red = "#C62536"
widget_css = paste0(
 "body{background:",paper,";color:",ink,";font-family:'DejaVu Sans',sans-serif;padding:5px 10px;margin:0;font-size:18px}",
 ".container-fluid{padding:0}.form-group{margin-bottom:12px}.control-label{font-size:18px}",
 ".form-control{font-size:18px;height:39px;background:",paper,";border:1px solid #839a99}",
 ".widget-controls{display:flex;gap:20px}.widget-controls>div{flex:1}",
 ".result{font-size:21px;font-weight:bold;line-height:1.35;color:",teal,";white-space:pre-line}",
 ".caption{font-size:15px;color:#59666d;line-height:1.3;margin-top:9px}",
 ".shiny-plot-output{position:relative;overflow:hidden}.shiny-plot-output img{display:block;width:100%!important;height:100%!important;object-fit:contain}",
 "@font-face{font-family:'DejaVu Sans';src:url('deck/assets/DejaVuSans.ttf')}"
)
connection_js = "$(document).on('shiny:connected',function(){parent.postMessage('shiny-connected',location.origin);});$(document).on('shiny:disconnected',function(){parent.postMessage('shiny-disconnected',location.origin);});"
ui = function(request) {
  query = parseQueryString(request$QUERY_STRING)
  widget = query$widget
  if (is.null(widget)) {
    return(fluidPage(tags$head(tags$title("DATA1x01 revision")),
      tags$style("html,body,.container-fluid{padding:0;margin:0;width:100%;height:100%;overflow:hidden}"),
      tags$script(HTML("const target = new URL('deck/masterclass.html', window.location.href); target.search = window.location.search; target.searchParams.set('shiny','1'); target.hash = window.location.hash; window.location.replace(target.href);")),
      tags$p("Opening the presentation…")))
  }
  if (!widget %in% c("sampling", "ci")) return(fluidPage("Unknown widget"))
  common = tags$head(tags$style(HTML(widget_css)), tags$script(HTML(connection_js)))
  if (widget == "sampling") {
    fluidPage(common,
      div(class="widget-controls",
        selectInput("n", "Sample size n", choices=c(25,100,400), selected=25, selectize=FALSE),
        selectInput("B", "Simulation replicates", choices=c(100,500,2000), selected=500, selectize=FALSE)),
      plotOutput("sampling_plot", height="260px"),
      textOutput("sampling_result", container=function(...) tags$div(class="result", ...)),
      div(class="caption", "Independent draws from N(7, 1.2²). Change n, then change only the number of replicates. Which changes theoretical SE?"))
  } else {
    fluidPage(common,
      sliderInput("mu0", "Null mean change (hours)", min=-0.25,max=1.5,value=0.75,step=0.25),
      plotOutput("ci_plot", height="250px"),
      textOutput("ci_result", container=function(...) tags$div(class="result", ...)),
      div(class="caption", "Paired t-test. 15 df. Two-sided α = 0.05."))
  }
}
plot_theme = theme_minimal(base_size=15) + theme(
  panel.grid.minor=element_blank(), panel.grid.major.y=element_blank(),
  plot.background=element_rect(fill=paper,colour=NA),
  panel.background=element_rect(fill=paper,colour=NA),
  axis.title=element_text(colour=ink),axis.text=element_text(colour=ink),
  plot.margin=margin(8,12,8,8))
server = function(input, output, session) {
  simulated_means = reactive({
    req(input$n,input$B)
    n = as.integer(input$n); B = as.integer(input$B)
    set.seed(1001)
    rowMeans(matrix(rnorm(n*B,mean=7,sd=1.2),nrow=B,ncol=n))
  })
  output$sampling_plot = renderPlot({
    x = data.frame(mean=simulated_means())
    n = as.integer(input$n)
    ggplot(x,aes(mean)) +
      geom_histogram(aes(y=after_stat(density)),binwidth=.035,boundary=7,
                     fill="#C5DFDB",colour=paper,linewidth=.4) +
      stat_function(fun=dnorm,args=list(mean=7,sd=1.2/sqrt(n)),colour=teal,linewidth=1.1) +
      coord_cartesian(xlim=c(6.1,7.9),ylim=c(0,8.3)) +
      labs(x="Sample mean sleep (hours)",y="Density") + plot_theme
  },width=520,height=260,res=110)
  output$sampling_result = renderText({
    sprintf("n = %d: EV = 7 h. SE = %.2f h.\n%d replicates: simulated SD = %.3f h.",
            as.integer(input$n),1.2/sqrt(as.integer(input$n)),as.integer(input$B),sd(simulated_means()))
  })
  ci_test = reactive({req(input$mu0);t.test(D,mu=input$mu0)})
  output$ci_plot = renderPlot({
    test = ci_test(); ci = test$conf.int
    ggplot(data.frame(mean=mean(D),lower=ci[1],upper=ci[2]),aes(x=mean,y=1)) +
      geom_segment(aes(x=lower,xend=upper,yend=1),colour=teal,linewidth=3) +
      geom_point(colour=teal,size=4) +
      geom_vline(xintercept=input$mu0,colour=red,linetype="dashed",linewidth=1) +
      annotate("text",x=.5,y=1.23,label="95% confidence interval",size=5,colour=ink) +
      coord_cartesian(xlim=c(-.5,1.75),ylim=c(.7,1.45)) +
      scale_y_continuous(breaks=NULL) + labs(x="Mean sleep change (hours)",y=NULL) +
      plot_theme + theme(panel.grid=element_blank())
  },width=520,height=250,res=110)
  output$ci_result = renderText({
    test=ci_test()
    sprintf("t = %.2f, p = %.4f. %s H₀ at 5%%.\n95%% CI: [%.5f, %.5f].",unname(test$statistic),test$p.value,
            if(test$p.value<.05)"Reject" else "Retain",test$conf.int[1],test$conf.int[2])
  })
}
shinyApp(ui,server)
