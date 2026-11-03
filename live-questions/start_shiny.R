# Called by the live-voting launcher with the project as the working directory.
shiny::runApp("shiny",host="127.0.0.1",port=as.integer(Sys.getenv("LQ_SHINY_PORT")),launch.browser=FALSE)
