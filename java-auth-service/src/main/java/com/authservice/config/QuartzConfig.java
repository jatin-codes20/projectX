package com.authservice.config;

import lombok.extern.slf4j.Slf4j;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.utils.ConnectionProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.scheduling.quartz.SchedulerFactoryBean;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.quartz.QuartzProperties;

@Configuration
@Slf4j
@RequiredArgsConstructor
public class QuartzConfig {

    private final DataSource dataSource;
    private final QuartzProperties quartzProperties;

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
        if (quartzProperties.getSchedulerName() != null) {
            factory.setSchedulerName(quartzProperties.getSchedulerName());
        }
        factory.setDataSource(dataSource);
        factory.setJobFactory(new org.springframework.scheduling.quartz.SpringBeanJobFactory());
        factory.setQuartzProperties(loadQuartzProperties());
        factory.setWaitForJobsToCompleteOnShutdown(quartzProperties.isWaitForJobsToCompleteOnShutdown());
        factory.setOverwriteExistingJobs(quartzProperties.isOverwriteExistingJobs());
        factory.setAutoStartup(quartzProperties.isAutoStartup());
        if (quartzProperties.getStartupDelay() != null) {
            factory.setStartupDelay((int) quartzProperties.getStartupDelay().getSeconds());
        }
        
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

    private Properties loadQuartzProperties() {
        Properties properties = new Properties();
        properties.putAll(quartzProperties.getProperties());
        if (properties.isEmpty()) {
            log.warn("No Quartz properties detected under 'spring.quartz.properties'. Using defaults.");
        }
        return properties;
    }
}

