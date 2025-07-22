using Microsoft.EntityFrameworkCore;
using TechDocQRSystem.Api.Models;
using BCrypt.Net;

namespace TechDocQRSystem.Api.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Проверяем, есть ли уже пользователи
        if (await context.Users.AnyAsync())
        {
            return; // База уже заполнена
        }

        // Создаем администратора
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            Email = "admin@yandex.ru",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = "admin",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Создаем тестового пользователя
        var testUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "test",
            Email = "test@yandex.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("test123"),
            Role = "user",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(adminUser, testUser);
        await context.SaveChangesAsync();
    }
}