import React from 'react';
import { HashRouter as Router, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import type { AnyAction } from '@reduxjs/toolkit';
import {
    IconButton,
    Box,
    CloseButton,
    Flex,
    HStack,
    Icon,
    useColorModeValue,
    Link,
    Drawer,
    DrawerContent,
    Text,
    useDisclosure,
    BoxProps,
    FlexProps,
    Tooltip,
    DrawerOverlay,
    DrawerHeader,
    DrawerBody,
    Switch,
    FormControl,
    useColorMode,
    Spacer,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Button,
    Badge,
    Divider
} from '@chakra-ui/react';
import { FiHome, FiSettings, FiMenu, FiBell, FiMonitor, FiGithub, FiMessageCircle, FiTrash } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { AiOutlineBug, AiOutlineHome, AiOutlineApi } from 'react-icons/ai';
import { BsChevronDown, BsCheckAll } from 'react-icons/bs';
import { BiNotification } from 'react-icons/bi';
import { MdOutlineAttachMoney, MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import { IconType } from 'react-icons';
import { ReactText } from 'react';

import { HomeLayout } from '../../layouts/home/HomeLayout';
import { DevicesLayout } from '../../layouts/devices/DevicesLayout';
import { LogsLayout } from '../../layouts/logs/LogsLayout';
import { SettingsLayout } from '../../layouts/settings/SettingsLayout';
import { FcmLayout } from '../../layouts/fcm/FcmLayout';
import { ApiLayout } from '../../layouts/api/ApiLayout';
import logo from '../../../images/logo/icon-64.png';
import { NotificationsTable } from '../../components/tables/NotificationsTable';
import './styles.css';

import { useAppSelector, useAppDispatch } from '../../hooks';
import { readAll, clear as clearAlerts, NotificationItem } from '../../slices/NotificationsSlice';

interface LinkItemProps {
    name: string;
    icon: IconType;
    to: string;
}
const LinkItems: Array<LinkItemProps> = [
    { name: 'Home', icon: FiHome, to: '/' },
    { name: 'Devices', icon: FiMonitor, to: '/devices' },
    { name: 'Debug & Logs', icon: AiOutlineBug, to: '/logs' },
    { name: 'Google FCM', icon: BiNotification, to: '/fcm' },
    { name: 'API & Webhooks', icon: AiOutlineApi, to: '/webhooks' },
    { name: 'Settings', icon: FiSettings, to: '/settings' }
];

const closeNotification = (closeFunc: () => void, dispatch: React.Dispatch<AnyAction>) => {
    dispatch(readAll());
    closeFunc();
};

export const Navigation = (): JSX.Element => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isNotificationsOpen,
        onOpen: onNotificationOpen,
        onClose: onNotificationClose
    } = useDisclosure();

    const notifications: Array<NotificationItem> = useAppSelector(state => state.notificationStore.notifications);
    const unreadCount = notifications.filter(e => !e.read).length;
    const dispatch = useAppDispatch();

    return (
        <Box minH="100vh">
            <Router>
                <SidebarContent onClose={() => onClose} display={{ base: 'none', md: 'block' }} />
                <Drawer
                    autoFocus={false}
                    isOpen={isOpen}
                    placement="left"
                    onClose={onClose}
                    returnFocusOnClose={false}
                    onOverlayClick={onClose}
                    size="full"
                >
                    <DrawerContent>
                        <SidebarContent onClose={onClose} />
                    </DrawerContent>
                </Drawer>
                {/* mobilenav */}
                <MobileNav onOpen={onOpen} onNotificationOpen={onNotificationOpen} unreadCount={unreadCount} />
                <Box ml={{ base: 0, md: 60 }} p="2">
                    <Routes>
                        <Route path="/settings" element={<SettingsLayout />} />
                        <Route path="/logs"element={<LogsLayout />} />
                        <Route path="/fcm"element={<FcmLayout />} />
                        <Route path="/devices"element={<DevicesLayout />} />
                        <Route path="/webhooks"element={<ApiLayout />} />
                        <Route path="/" element={<HomeLayout />} />
                    </Routes>
                </Box>
            </Router>

            <Drawer onClose={() => closeNotification(onNotificationClose, dispatch)} isOpen={isNotificationsOpen} size="lg">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader>Notifications / Alerts ({unreadCount})</DrawerHeader>
                    <DrawerBody>
                        <Menu>
                            <MenuButton
                                as={Button}
                                rightIcon={<BsChevronDown />}
                                width="12em"mr={5}
                                mb={4}
                            >
                                Manage
                            </MenuButton>
                            <MenuList>
                                <MenuItem icon={<FiTrash />} onClick={() => {
                                    dispatch(clearAlerts());
                                }}>
                                    Clear Alerts
                                </MenuItem>
                                <MenuItem icon={<BsCheckAll />} onClick={() => {
                                    dispatch(readAll());
                                }}>
                                    Mark All as Read
                                </MenuItem>
                            </MenuList>
                        </Menu>
                        <NotificationsTable notifications={notifications} />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    );
};

interface SidebarProps extends BoxProps {
    onClose: () => void;
}

const SidebarContent = ({ onClose, ...rest }: SidebarProps) => {
    return (
        <Box
            bg={useColorModeValue('white', 'gray.900')}
            borderRight="1px"
            borderRightColor={useColorModeValue('gray.200', 'gray.700')}
            w={{ base: 'full', md: 60 }}
            pos="fixed"
            h="full"
            {...rest}
        >
            <Flex h="20" alignItems="center" mx="6" justifyContent="flex-start">
                <img src={logo} className="logo" alt="logo" height={48} />
                <Text fontSize="1xl" ml={2}>BlueBubbles</Text>
                <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
            </Flex>
            {LinkItems.map(link => (
                <RouterLink key={link.name} to={link.to}>
                    <NavItem icon={link.icon} to={link.to}>{link.name}</NavItem>
                </RouterLink>
            ))}
        </Box>
    );
};

interface NavItemProps extends FlexProps {
    icon: IconType;
    to: string;
    children: ReactText;
}
const NavItem = ({ icon, to, children, ...rest }: NavItemProps) => {
    const location = useLocation();
    return (
        <Flex
            align="center"
            p="4"
            mx="4"
            borderRadius="lg"
            role="group"
            cursor="pointer"
            _hover={{
                bg: 'brand.primary',
                color: 'white'
            }}
            color={location.pathname === to ? 'brand.primary' : 'current'}
            {...rest}
        >
            {icon && (
                <Icon
                    mr="4"
                    fontSize="16"
                    _groupHover={{
                        color: 'white'
                    }}
                    as={icon}
                />
            )}
            {children}
        </Flex>
    );
};

interface MobileProps extends FlexProps {
    onOpen: () => void;
    onNotificationOpen: () => void;
    unreadCount: number;
}
const MobileNav = ({ onOpen, onNotificationOpen, unreadCount, ...rest }: MobileProps) => {
    const { colorMode, toggleColorMode } = useColorMode();

    return (
        <Flex
            ml={{ base: 0, md: 60 }}
            px={{ base: 4, md: 4 }}
            height="20"
            alignItems="center"
            bg={useColorModeValue('white', 'gray.900')}
            borderBottomWidth="1px"
            borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
            justifyContent={{ base: 'space-between', md: 'flex-end' }}
            {...rest}
        >
            <IconButton
                display={{ base: 'flex', md: 'none' }}
                onClick={onOpen}
                variant="outline"
                aria-label="open menu"
                icon={<FiMenu />}
            />

            <Text display={{ base: 'flex', md: 'none' }} fontSize="2xl" fontFamily="monospace" fontWeight="bold">
                <img src={logo} className="logo-small" alt="logo" />
            </Text>

            <HStack spacing={{ base: '0', md: '1' }}>
                <Tooltip label="Website Home" aria-label="website-tip">
                    <Link href="https://bluebubbles.app" style={{ textDecoration: 'none' }} target="_blank">
                        <IconButton size="lg" variant="ghost" aria-label="website" icon={<AiOutlineHome />} />
                    </Link>
                </Tooltip>
                <Tooltip label="BlueBubbles Web" aria-label="website-tip">
                    <Link href="https://bluebubbles.app/web" style={{ textDecoration: 'none' }} target="_blank">
                        <IconButton size="lg" variant="ghost" aria-label="bluebubbles web" icon={<FiMessageCircle />} />
                    </Link>
                </Tooltip>
                <Tooltip label="Support Us" aria-label="donate-tip">
                    <Link href="https://bluebubbles.app/donate" style={{ textDecoration: 'none' }} target="_blank">
                        <IconButton size="lg" variant="ghost" aria-label="donate" icon={<MdOutlineAttachMoney />} />
                    </Link>
                </Tooltip>
                <Tooltip label="Join our Discord" aria-label="discord-tip">
                    <Link href="https://discord.gg/yC4wr38" style={{ textDecoration: 'none' }} target="_blank">
                        <IconButton size="lg" variant="ghost" aria-label="discord" icon={<FaDiscord />} />
                    </Link>
                </Tooltip>
                <Tooltip label="Read our Source Code" aria-label="github-tip">
                    <Link href="https://github.com/BlueBubblesApp" style={{ textDecoration: 'none' }} target="_blank">
                        <IconButton size="lg" variant="ghost" aria-label="github" icon={<FiGithub />} />
                    </Link>
                </Tooltip>
                <Box position='relative' float='left'>
                    <IconButton
                        size="lg"
                        verticalAlign='middle'
                        zIndex={1}
                        variant="ghost"
                        aria-label="notifications"
                        icon={<FiBell />}
                        onClick={() => onNotificationOpen()}
                    />
                    {(unreadCount > 0) ? (
                        <Badge
                            borderRadius='lg'
                            variant='solid'
                            colorScheme='red'
                            position='absolute'
                            margin={0}
                            top={1}
                            right={1}
                            zIndex={2}
                        >{unreadCount}</Badge>
                    ) : null}
                </Box>
                <Spacer />
                <Divider orientation="vertical" width={1} height={15} borderColor='gray' />
                <Spacer />
                <Spacer />
                <Spacer />
                <FormControl display='flex' alignItems='center'>
                    <Box mr={2}><MdOutlineDarkMode size={20} /></Box>
                    <Switch id='theme-mode-toggle' onChange={toggleColorMode} isChecked={colorMode === 'light'} />
                    <Box ml={2}><MdOutlineLightMode size={20} /></Box>
                </FormControl>
            </HStack>
        </Flex>
    );
};
