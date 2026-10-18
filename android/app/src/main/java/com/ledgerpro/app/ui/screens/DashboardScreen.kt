package com.ledgerpro.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ledgerpro.app.data.model.Transaction
import com.ledgerpro.app.data.model.User
import com.ledgerpro.app.ui.theme.*
import java.text.NumberFormat
import java.util.Locale

@Composable
fun DashboardScreen(
    user: User,
    transactions: List<Transaction>,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    onLogout: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onSelectTransaction: (Transaction) -> Unit,
    onNewTransaction: () -> Unit,
    onRecordPayment: (Transaction) -> Unit
) {
    val pesoFormat = remember {
        NumberFormat.getCurrencyInstance(Locale("en", "PH")).apply {
            currency = java.util.Currency.getInstance("PHP")
        }
    }

    val totalBilled = remember(transactions) { transactions.sumOf { it.totalBill } }
    val totalPaid = remember(transactions) { transactions.sumOf { it.amountPaid } }
    val totalBalance = remember(transactions) { transactions.sumOf { it.balance } }
    val overdueCount = remember(transactions) {
        transactions.count { it.paymentStatus.equals("Overdue", ignoreCase = true) }
    }

    Scaffold(
        containerColor = DarkBackground,
        floatingActionButton = {
            if (user.canModify) {
                FloatingActionButton(
                    onClick = onNewTransaction,
                    containerColor = PrimaryBlue,
                    contentColor = TextPrimary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "New Billing")
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                // User & Role Greeting
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Ledger Dashboard",
                            style = MaterialTheme.typography.headlineMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = "${user.fullName} (${user.role.uppercase()})",
                            style = MaterialTheme.typography.bodyMedium,
                            color = AccentCyan
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onRefresh) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextSecondary)
                        }
                        IconButton(onClick = onOpenSettings) {
                            Icon(Icons.Default.Settings, contentDescription = "Server Settings", tint = TextSecondary)
                        }
                        IconButton(onClick = onLogout) {
                            Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out", tint = StatusOverdueText)
                        }
                    }
                }
            }

            // Stat Cards Grid
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MetricCard(
                            title = "Total Billed",
                            amount = pesoFormat.format(totalBilled),
                            icon = Icons.Default.ReceiptLong,
                            accentColor = PrimaryBlue,
                            modifier = Modifier.weight(1f)
                        )
                        MetricCard(
                            title = "Collected (Paid)",
                            amount = pesoFormat.format(totalPaid),
                            icon = Icons.Default.CheckCircle,
                            accentColor = StatusPaidText,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        MetricCard(
                            title = "Receivables Balance",
                            amount = pesoFormat.format(totalBalance),
                            icon = Icons.Default.PendingActions,
                            accentColor = StatusPendingText,
                            modifier = Modifier.weight(1f)
                        )
                        MetricCard(
                            title = "Overdue Accounts",
                            amount = "$overdueCount Project(s)",
                            icon = Icons.Default.Warning,
                            accentColor = StatusOverdueText,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Section Header: Recent Transactions
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Transactions (${transactions.size})",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                }
            }

            if (isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = PrimaryBlue)
                    }
                }
            } else if (transactions.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No transactions found", color = TextSecondary)
                    }
                }
            } else {
                items(transactions) { tx ->
                    TransactionMobileCard(
                        transaction = tx,
                        pesoFormat = pesoFormat,
                        onClick = { onSelectTransaction(tx) },
                        onQuickPay = { onRecordPayment(tx) },
                        canModify = user.canModify
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    amount: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = title, fontSize = 12.sp, color = TextSecondary)
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = accentColor,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = amount,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }
    }
}

@Composable
fun TransactionMobileCard(
    transaction: Transaction,
    pesoFormat: NumberFormat,
    onClick: () -> Unit,
    onQuickPay: () -> Unit,
    canModify: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = transaction.client,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )
                    Text(
                        text = transaction.projectName,
                        fontSize = 13.sp,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
                StatusBadge(status = transaction.paymentStatus)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Total Bill", fontSize = 11.sp, color = TextMuted)
                    Text(
                        text = pesoFormat.format(transaction.totalBill),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = TextPrimary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Balance", fontSize = 11.sp, color = TextMuted)
                    Text(
                        text = pesoFormat.format(transaction.balance),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = if (transaction.balance > 0) StatusPendingText else StatusPaidText
                    )
                }
            }

            if (canModify && transaction.balance > 0) {
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(
                    onClick = onQuickPay,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentCyan),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Payment, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Record Payment (₱${pesoFormat.format(transaction.balance).replace("PHP", "").trim()})", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: String) {
    val (bg, fg) = when (status.lowercase()) {
        "paid" -> Pair(StatusPaidBg, StatusPaidText)
        "partially paid" -> Pair(StatusPartialBg, StatusPartialText)
        "overdue" -> Pair(StatusOverdueBg, StatusOverdueText)
        else -> Pair(StatusPendingBg, StatusPendingText)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = status,
            color = fg,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}
