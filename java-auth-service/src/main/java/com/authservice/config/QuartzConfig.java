package com.authservice.config;

import lombok.extern.slf4j.Slf4j;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.utils.ConnectionProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@Configuration
@Slf4j
public class QuartzConfig {

    @Autowired
    private DataSource dataSource;

    @Bean
    @DependsOn("dataSource")
    public SchedulerFactoryBean schedulerFactoryBean() throws SQLException {
        if (dataSource == null) {
            throw new IllegalStateException("DataSource is null. Cannot configure Quartz scheduler.");
        }
        
        // Register DataSource with Quartz's connection manager
        org.quartz.utils.DBConnectionManager.getInstance().addConnectionProvider(
            "quartzDataSource",
            new ConnectionProvider() {
                @Override
                public Connection getConnection() throws SQLException {
                    return dataSource.getConnection();
                }
                
                @Override
                public void shutdown() throws SQLException {
                    // Spring manages DataSource lifecycle, so we don't close it here
                }
                
                @Override
                public void initialize() throws SQLException {
                    // No initialization needed
                }
            }
        );
        
        SchedulerFactoryBean factory = new SchedulerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJobFactory(new org.springframework.scheduling.quartz.SpringBeanJobFactory());
        
        // Quartz properties
        java.util.Properties props = new java.util.Properties();
        props.put("org.quartz.scheduler.instanceName", "ScheduledPostScheduler");
        props.put("org.quartz.scheduler.instanceId", "AUTO");
        
        // Job store configuration (JDBC for persistence)
        props.put("org.quartz.jobStore.class", "org.quartz.impl.jdbcjobstore.JobStoreTX");
        props.put("org.quartz.jobStore.driverDelegateClass", "org.quartz.impl.jdbcjobstore.PostgreSQLDelegate");
        props.put("org.quartz.jobStore.tablePrefix", "QRTZ_");
        props.put("org.quartz.jobStore.useProperties", "false");
        props.put("org.quartz.jobStore.dataSource", "quartzDataSource");
        
        // Clustering configuration
        props.put("org.quartz.jobStore.isClustered", "true");
        props.put("org.quartz.jobStore.clusterCheckinInterval", "20000");
        
        // Thread pool configuration
        props.put("org.quartz.threadPool.class", "org.quartz.simpl.SimpleThreadPool");
        props.put("org.quartz.threadPool.threadCount", "10");
        props.put("org.quartz.threadPool.threadPriority", "5");
        
        // Misfire handling
        props.put("org.quartz.jobStore.misfireThreshold", "60000");
        
        factory.setQuartzProperties(props);
        factory.setWaitForJobsToCompleteOnShutdown(true);
        factory.setOverwriteExistingJobs(false);
        factory.setStartupDelay(5); // Small delay to ensure everything is initialized
        
        log.info("Quartz Scheduler configured with JDBC JobStore");
        log.info("DataSource: {}", dataSource.getClass().getName());
        return factory;
    }

    @Bean
    @DependsOn("schedulerFactoryBean")
    public Scheduler scheduler() throws SchedulerException, SQLException {
        Scheduler scheduler = schedulerFactoryBean().getScheduler();
        scheduler.start();
        log.info("Quartz Scheduler started successfully");
        return scheduler;
    }
}

