import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class TestDbConnection {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://db.dxacbuxydjlrjltvexkb.supabase.co:5432/postgres";
        String username = "postgres";
        String password = "Ssrr!@34";
        
        try {
            System.out.println("Testing database connection...");
            Connection connection = DriverManager.getConnection(url, username, password);
            System.out.println("✅ Database connection successful!");
            connection.close();
        } catch (SQLException e) {
            System.out.println("❌ Database connection failed:");
            System.out.println("Error: " + e.getMessage());
        }
    }
}


