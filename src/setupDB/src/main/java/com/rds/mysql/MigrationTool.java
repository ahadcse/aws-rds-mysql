package com.rds.mysql;

import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.auth.EnvironmentVariableCredentialsProvider;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.simplesystemsmanagement.AWSSimpleSystemsManagement;
import com.amazonaws.services.simplesystemsmanagement.AWSSimpleSystemsManagementClientBuilder;
import com.amazonaws.services.simplesystemsmanagement.model.GetParameterRequest;
import com.amazonaws.services.simplesystemsmanagement.model.GetParameterResult;
import com.amazonaws.services.simplesystemsmanagement.model.GetParametersRequest;
import com.amazonaws.services.simplesystemsmanagement.model.GetParametersResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import liquibase.Liquibase;
import liquibase.changelog.ChangeLogParameters;
import liquibase.changelog.ChangeSet;
import liquibase.changelog.DatabaseChangeLog;
import liquibase.database.Database;
import liquibase.database.DatabaseConnection;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.LiquibaseException;
import liquibase.resource.ClassLoaderResourceAccessor;
import liquibase.resource.ResourceAccessor;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.text.MessageFormat;
import java.util.*;
import java.util.stream.Collectors;

import static java.util.Collections.singletonMap;

@SuppressWarnings("unused")
public class MigrationTool implements RequestHandler<Void, String> {


    private static final String DB_PASSWORD_SSM_PARAM_NAME = "/config/root_password";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final static String updaterChangelogParameter = "user.updater_password";
    private final static String updaterPasswordSsmPath = "/config/updater_password";
    private final static String readerChangelogParameter = "user.reader_password";
    private final static String readerPasswordSsmPath = "/config/reader_password";

    @Override
    public String handleRequest(Void input, Context context) {
        validateEnvVars();
        try {
            doMigration();
            return MAPPER.writeValueAsString(singletonMap("result", "successfully migrated"));
        } catch (LiquibaseException | SQLException | JsonProcessingException e) {
            e.printStackTrace();
            throw new RuntimeException();
        }
    }

    private void doMigration() throws LiquibaseException, SQLException {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        ResourceAccessor resourceAccessor = new ClassLoaderResourceAccessor(classLoader);
        DatabaseConnection databaseConnection = new JdbcConnection(DriverManager.getConnection(getUrl(), getConnectionProperties()));
        Database database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(databaseConnection);

        Map<String, String> userPasswordFromSSM = getUserPasswordsFromSSM(Arrays.asList(updaterPasswordSsmPath, readerPasswordSsmPath));

        DatabaseChangeLog databaseChangeLog = new DatabaseChangeLog();
        ChangeLogParameters changeLogParameters = new ChangeLogParameters();
        changeLogParameters.set(updaterChangelogParameter, userPasswordFromSSM.get(updaterPasswordSsmPath));
        changeLogParameters.set(readerChangelogParameter, userPasswordFromSSM.get(readerPasswordSsmPath));

        databaseChangeLog.setChangeLogParameters(changeLogParameters);
        databaseChangeLog.includeAll("lbase/scripts", false, null,
                false, null, resourceAccessor, null);

        System.out.println("Change logs found.");
        System.out.println(databaseChangeLog.getChangeSets().stream().map(ChangeSet::getFilePath).collect(Collectors.joining()));

        Liquibase liquibase = new Liquibase(databaseChangeLog, resourceAccessor, database);
        liquibase.update((String) null);
    }

    private Properties getConnectionProperties() {
        Properties properties = new Properties();
        Map<String, String> map = new HashMap<>();
        map.put("user", System.getenv("DB_USERNAME"));
        map.put("password", System.getenv(getRootPasswordFromSSM()));
        properties.putAll(map);
        return properties;
    }

    private Map<String, String> getUserPasswordsFromSSM(List<String> ssmKeys) {
        AWSCredentialsProvider provider = new EnvironmentVariableCredentialsProvider();
        AWSSimpleSystemsManagement ssm = AWSSimpleSystemsManagementClientBuilder
                .standard()
                .withCredentials(provider)
                .build();
        GetParametersResult ssmParameter = ssm.getParameters(new GetParametersRequest()
                .withNames(ssmKeys)
                .withWithDecryption(true));
        if (ssmParameter.getSdkHttpMetadata().getHttpStatusCode() != 200) {
            throw new RuntimeException("No SSM parameters found for names " + readerPasswordSsmPath
                    + " and " + updaterPasswordSsmPath);
        }
        Map<String, String> map = new HashMap<>();
        ssmParameter.getParameters().forEach(parameter -> map.put(parameter.getName(), parameter.getValue()));
        return map;
    }

    private String getRootPasswordFromSSM() {
        AWSCredentialsProvider awsCredentialsProvider = new EnvironmentVariableCredentialsProvider();
        AWSSimpleSystemsManagement ssm = AWSSimpleSystemsManagementClientBuilder
                .standard()
                .withCredentials(awsCredentialsProvider)
                .build();
        GetParameterResult ssmParameter = ssm.getParameter(new GetParameterRequest()
                .withName(DB_PASSWORD_SSM_PARAM_NAME)
                .withWithDecryption(true));
        if (ssmParameter.getSdkHttpMetadata().getHttpStatusCode() != 200) {
            throw new RuntimeException("No SSM parameter found with names " + DB_PASSWORD_SSM_PARAM_NAME);
        }
        return ssmParameter.getParameter().getValue();
    }

    private String getUrl() {
        return MessageFormat.format("jdbc:mysql://{0}:3306/{1}",
                System.getenv("DB_HOST"),
                System.getenv("DB_NAME"));
    }

    private void validateEnvVars() {
        Arrays.asList("DB_HOST", "DB_NAME", "DB_USERNAME").forEach(str -> {
            if (System.getenv(str) == null || System.getenv(str).isEmpty()) {
                throw new NullPointerException(str + " env var was null or empty");
            }
        });
    }

}
