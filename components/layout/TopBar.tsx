'use client';

import React from 'react';
import {
    AppBar,
    Box,
    IconButton,
    Toolbar,
    Typography,
    InputBase,
    Badge,
    Menu,
    MenuItem,
    Avatar,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Search as SearchIcon,
    Notifications as NotificationsIcon,
    ArrowDropDown,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    width: '100%',
    maxWidth: '400px', // Batas maksimal lebar
    border: '1px solid #e0e0e0',
    borderRadius: '50px',
    [theme.breakpoints.down('sm')]: {
        maxWidth: '250px',
    },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9e9e9e',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
    },
}));

interface TopBarProps {
    handleDrawerToggle: () => void;
}

export default function TopBar({ handleDrawerToggle }: TopBarProps) {
    const { user, signOut } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleSignOut = async () => {
        await signOut();
        handleMenuClose();
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                boxShadow: 'none',
                background: 'white',
                color: 'black',
                borderBottom: '1px solid #f0f0f0',
                // Pastikan AppBar tidak tumpang tindih dengan sidebar
                zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
        >
            <Toolbar>
                {/* Mobile Menu Button - Kiri */}
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { md: 'none' } }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Logo/Brand - Kiri (Desktop) */}
                <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 3 }}>
                    <Typography variant="h6" fontWeight="bold" color="#bc5a3c">
                        Wardes Admin
                    </Typography>
                </Box>

                {/* Spacer untuk mendorong search ke tengah */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Search Bar - Tengah */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexGrow: 0,
                    mx: 2
                }}>
                    <Search>
                        <SearchIconWrapper>
                            <SearchIcon />
                        </SearchIconWrapper>
                        <StyledInputBase
                            placeholder="Search menu, orders, customers..."
                            inputProps={{ 'aria-label': 'search' }}
                        />
                    </Search>
                </Box>

                {/* Spacer untuk menyeimbangkan */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Right Side - Notifications & Profile */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        color="inherit"
                        sx={{
                            mr: 1,
                            '&:hover': {
                                bgcolor: '#f5f5f5',
                            }
                        }}
                    >
                        <Badge badgeContent={4} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            ml: 1,
                            p: 1,
                            borderRadius: 50,
                            '&:hover': {
                                bgcolor: '#f5f5f5',
                            }
                        }}
                        onClick={handleProfileMenuOpen}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: '#bc5a3c',
                            }}
                        >
                            {user?.email?.charAt(0).toUpperCase() || 'A'}
                        </Avatar>
                        <Box sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" fontWeight="medium">
                                {user?.email?.split('@')[0] || 'Admin'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Administrator
                            </Typography>
                        </Box>
                        <ArrowDropDown sx={{ color: 'text.secondary', ml: 0.5 }} />
                    </Box>
                </Box>
            </Toolbar>

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 0.5,
                        minWidth: 180,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        borderRadius: 2,
                    }
                }}
            >
                <MenuItem
                    onClick={handleMenuClose}
                    sx={{ py: 1.5 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: '#bc5a3c' }}>
                            {user?.email?.charAt(0).toUpperCase() || 'A'}
                        </Avatar>
                        Profile
                    </Box>
                </MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
                    Settings
                </MenuItem>
                <MenuItem
                    onClick={handleSignOut}
                    sx={{
                        py: 1.5,
                        color: 'error.main',
                        '&:hover': {
                            bgcolor: 'error.light',
                            color: 'error.contrastText'
                        }
                    }}
                >
                    Sign Out
                </MenuItem>
            </Menu>
        </AppBar>
    );
}